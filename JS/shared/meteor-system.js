const DEFAULT_METEOR_CONFIG = {
  trailEndSize: 1,
  alphaTest: 0.01,
  trailScaleFalloff: 0.997,
  trailStepDivisor: 3,
};

function createMeteorPointTexture(THREE) {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  const gradient = ctx.createRadialGradient(
    size * 0.5,
    size * 0.5,
    1,
    size * 0.5,
    size * 0.5,
    size * 0.5,
  );
  gradient.addColorStop(0, 'rgba(255,255,255,1.0)');
  gradient.addColorStop(0.35, 'rgba(255,255,255,0.95)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  const texture = new THREE.CanvasTexture(canvas);
  texture.generateMipmaps = true;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

function createMeteorPointsMaterial(THREE, pointTexture, alphaTest) {
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
    sizeAttenuation: true,
    map: pointTexture,
    transparent: true,
    opacity: 1,
    alphaTest: alphaTest,
    depthTest: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexColors: true,
    fog: false,
  });

  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        'uniform float size;',
        'uniform float size;\nattribute float pointSize;\nattribute float pointAlpha;\nvarying float vPointAlpha;',
      )
      .replace(
        'gl_PointSize = size;',
        'gl_PointSize = max(1.0, size * pointSize);\nvPointAlpha = pointAlpha;',
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nvarying float vPointAlpha;',
      )
      .replace(
        'vec4 diffuseColor = vec4( diffuse, opacity );',
        'vec4 diffuseColor = vec4( diffuse, opacity * vPointAlpha );',
      );
  };
  material.needsUpdate = true;

  return material;
}

export function createMeteorSystem({
  THREE,
  scene,
  meteorTemplate,
  maxDistance,
  speed,
  trailEndSize = DEFAULT_METEOR_CONFIG.trailEndSize,
  alphaTest = DEFAULT_METEOR_CONFIG.alphaTest,
  trailScaleFalloff = DEFAULT_METEOR_CONFIG.trailScaleFalloff,
  trailStepDivisor = DEFAULT_METEOR_CONFIG.trailStepDivisor,
}) {
  if (
    !THREE ||
    !scene ||
    !meteorTemplate ||
    !Number.isFinite(maxDistance) ||
    !Number.isFinite(speed)
  ) {
    return null;
  }

  const pointTexture = createMeteorPointTexture(THREE);
  const meteorPointsMaterial = createMeteorPointsMaterial(
    THREE,
    pointTexture,
    alphaTest,
  );

  const maxDistanceSq = maxDistance * maxDistance;
  const minClosestDistance = maxDistance * 0.7;
  const maxClosestDistance = maxDistance * 0.9;
  const minClosestDistanceSq = minClosestDistance * minClosestDistance;
  const maxClosestDistanceSq = maxClosestDistance * maxClosestDistance;

  function sampleUnitVector() {
    const z = Math.random() * 2 - 1;
    const azimuth = Math.random() * Math.PI * 2;
    const radial = Math.sqrt(Math.max(0, 1 - z * z));
    return new THREE.Vector3(
      radial * Math.cos(azimuth),
      radial * Math.sin(azimuth),
      z,
    );
  }

  function samplePointInSphericalShell(minRadius, maxRadius) {
    const minRadius3 = minRadius * minRadius * minRadius;
    const maxRadius3 = maxRadius * maxRadius * maxRadius;
    const radius = Math.cbrt(
      Math.random() * (maxRadius3 - minRadius3) + minRadius3,
    );
    return sampleUnitVector().multiplyScalar(radius);
  }

  function sampleConstrainedVelocity(position) {
    const radialDistance = position.length();
    const radialDirection = position
      .clone()
      .divideScalar(Math.max(radialDistance, 1e-8));

    const minMuAbs = Math.sqrt(
      Math.max(0, 1 - maxClosestDistanceSq / (radialDistance * radialDistance)),
    );
    const maxMuAbs = Math.sqrt(
      Math.max(0, 1 - minClosestDistanceSq / (radialDistance * radialDistance)),
    );

    const inboundLength = Math.max(0, maxMuAbs - minMuAbs);
    const outboundAllowed = radialDistance <= maxClosestDistance;
    const outboundLength = outboundAllowed ? 1 : 0;
    const totalLength = inboundLength + outboundLength;

    let mu = -maxMuAbs;
    if (totalLength > 0) {
      const pick = Math.random() * totalLength;
      if (pick < inboundLength) {
        mu = -(minMuAbs + Math.random() * inboundLength);
      } else {
        mu = Math.random();
      }
    }

    const tangentMagnitude = Math.sqrt(Math.max(0, 1 - mu * mu));
    const referenceAxis =
      Math.abs(radialDirection.z) < 0.999
        ? new THREE.Vector3(0, 0, 1)
        : new THREE.Vector3(0, 1, 0);
    const tangent1 = new THREE.Vector3()
      .crossVectors(radialDirection, referenceAxis)
      .normalize();
    const tangent2 = new THREE.Vector3()
      .crossVectors(radialDirection, tangent1)
      .normalize();
    const tangentAngle = Math.random() * Math.PI * 2;

    return radialDirection
      .clone()
      .multiplyScalar(mu)
      .add(tangent1.multiplyScalar(Math.cos(tangentAngle) * tangentMagnitude))
      .add(tangent2.multiplyScalar(Math.sin(tangentAngle) * tangentMagnitude))
      .normalize();
  }

  function createSpawnState() {
    const spawnPosition = samplePointInSphericalShell(
      minClosestDistance,
      maxDistance,
    );
    const x = spawnPosition.x;
    const y = spawnPosition.y;
    const z = spawnPosition.z;
    const velocity = sampleConstrainedVelocity(spawnPosition);

    return {
      x,
      y,
      z,
      velocity,
    };
  }

  function spawnMeteor(baseSize) {
    const adjustedTrailFalloff = 1 - (1 - trailScaleFalloff);

    let size = baseSize;
    const originalSize = size;
    const meteorObject3D = meteorTemplate.clone();

    const spawnState = createSpawnState();
    let x = spawnState.x;
    let y = spawnState.y;
    let z = spawnState.z;
    const velocity = spawnState.velocity;

    const originX = x;
    const originY = y;
    const originZ = z;
    const positions = [];
    const pointSizes = [];
    const pointAlphas = [];
    const pointColors = [];
    let maxMeteorLengthSq = 0;

    const pushPoint = (px, py, pz, psize, palpha) => {
      positions.push(px, py, pz);
      pointSizes.push(psize);
      pointAlphas.push(palpha);
      pointColors.push(1, 1, 1);
      const pointDistanceSq = px * px + py * py + pz * pz;
      if (pointDistanceSq > maxMeteorLengthSq) {
        maxMeteorLengthSq = pointDistanceSq;
      }
    };

    const trailDenominator = Math.max(0.0001, originalSize - trailEndSize);
    while (size > trailEndSize) {
      const sizeFactor = Math.pow(size / originalSize, 0.25);
      const bodySizeMultiplier = 1 + (sizeFactor - 1);
      const progress = (originalSize - size) / trailDenominator;
      const fade = (1 - progress) * (1 - progress);

      pushPoint(
        x - originX,
        y - originY,
        z - originZ,
        size * bodySizeMultiplier,
        fade,
      );

      x -= (velocity.x * size) / trailStepDivisor;
      y -= (velocity.y * size) / trailStepDivisor;
      z -= (velocity.z * size) / trailStepDivisor;
      size *= adjustedTrailFalloff;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(new Float32Array(positions), 3),
    );
    geometry.setAttribute(
      'pointSize',
      new THREE.BufferAttribute(new Float32Array(pointSizes), 1),
    );
    geometry.setAttribute(
      'pointAlpha',
      new THREE.BufferAttribute(new Float32Array(pointAlphas), 1),
    );
    geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(new Float32Array(pointColors), 3),
    );
    geometry.computeBoundingSphere();

    const meteorPoints = new THREE.Points(geometry, meteorPointsMaterial);
    meteorPoints.frustumCulled = false;
    meteorPoints.position.set(0, 0, 0);
    meteorObject3D.add(meteorPoints);
    meteorObject3D.position.set(originX, originY, originZ);
    meteorObject3D.quaternion.identity();
    meteorObject3D.userData.meteorLength = Math.sqrt(maxMeteorLengthSq);
    meteorObject3D.userData.referenceDirection = velocity.clone().normalize();

    return [meteorObject3D, velocity];
  }

  function resetMeteor(meteorEntry) {
    const meteorObject = meteorEntry[0];
    const meteorVelocity = meteorEntry[1];
    const spawnState = createSpawnState();

    meteorObject.position.set(spawnState.x, spawnState.y, spawnState.z);
    meteorVelocity.copy(spawnState.velocity);

    const referenceDirection = meteorObject.userData.referenceDirection;
    if (referenceDirection && referenceDirection.lengthSq() > 0) {
      const resetRotation = new THREE.Quaternion().setFromUnitVectors(
        referenceDirection,
        spawnState.velocity,
      );
      meteorObject.quaternion.copy(resetRotation);
    } else {
      meteorObject.quaternion.identity();
    }
  }

  function moveMeteor(meteorEntry, speedScale = 1) {
    const meteorObject = meteorEntry[0];
    const meteorVelocity = meteorEntry[1];
    const meteorLength = Number(meteorObject.userData.meteorLength) || 0;
    const maxDistanceWithLength = maxDistance + meteorLength;
    if (
      meteorObject.position.lengthSq() >
      maxDistanceWithLength * maxDistanceWithLength
    ) {
      resetMeteor(meteorEntry);
      return false;
    }
    meteorObject.position.addScaledVector(
      meteorVelocity,
      speed * 2 * Math.max(0, Number(speedScale) || 0),
    );
    return false;
  }

  function updateMeteorites(meteorites, maxCount, spawnSize, speedScale = 1) {
    const targetCount = Math.max(0, Math.floor(Number(maxCount) || 0));
    const nextSpawnSize = Number(spawnSize) || 0;

    while (meteorites.length < targetCount && nextSpawnSize > 0) {
      const meteorEntry = spawnMeteor(nextSpawnSize);
      meteorites.push(meteorEntry);
      scene.add(meteorEntry[0]);
    }

    if (meteorites.length > targetCount) {
      for (let i = meteorites.length - 1; i >= targetCount; i--) {
        const meteorEntry = meteorites[i];
        scene.remove(meteorEntry[0]);
        meteorEntry[0].traverse((node) => {
          if (node.geometry && typeof node.geometry.dispose === 'function') {
            node.geometry.dispose();
          }
        });
        meteorites.splice(i, 1);
      }
    }

    for (let i = 0; i < meteorites.length; i++) {
      moveMeteor(meteorites[i], speedScale);
    }
  }

  return {
    spawnMeteor,
    moveMeteor,
    updateMeteorites,
  };
}
