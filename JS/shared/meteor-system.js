const DEFAULT_METEOR_CONFIG = {
  sizeScaleMin: 0.7,
  sizeScaleRange: 0.6,
  spawnYMin: -500,
  spawnYRange: 4000,
  centerDotMin: 0.85,
  centerDotMax: 0.851,
  initialHeadCount: 2,
  initialStepDivisor: 3,
  trailEndSize: 1,
  trailMinScaleFactor: 0.6,
  trailScaleFalloff: 0.985,
  trailStepDivisor: 2.5,
};

function resolveSpriteMaterial(spriteOrMaterial) {
  if (!spriteOrMaterial) return null;
  if (spriteOrMaterial.isMaterial) return spriteOrMaterial;
  if (spriteOrMaterial.material && spriteOrMaterial.material.isMaterial) {
    return spriteOrMaterial.material;
  }
  return null;
}

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

function createMeteorPointsMaterial(THREE, pointTexture) {
  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1,
    sizeAttenuation: true,
    map: pointTexture,
    transparent: true,
    opacity: 1,
    alphaTest: 0.1,
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
  meteorHeadMaterial,
  meteorHeadAltMaterial,
  meteorTailMaterial,
  maxDistance,
  speed,
  sizeScaleMin = DEFAULT_METEOR_CONFIG.sizeScaleMin,
  sizeScaleRange = DEFAULT_METEOR_CONFIG.sizeScaleRange,
  spawnYMin = DEFAULT_METEOR_CONFIG.spawnYMin,
  spawnYRange = DEFAULT_METEOR_CONFIG.spawnYRange,
  centerDotMin = DEFAULT_METEOR_CONFIG.centerDotMin,
  centerDotMax = DEFAULT_METEOR_CONFIG.centerDotMax,
  initialHeadCount = DEFAULT_METEOR_CONFIG.initialHeadCount,
  initialStepDivisor = DEFAULT_METEOR_CONFIG.initialStepDivisor,
  trailEndSize = DEFAULT_METEOR_CONFIG.trailEndSize,
  trailMinScaleFactor = DEFAULT_METEOR_CONFIG.trailMinScaleFactor,
  trailScaleFalloff = DEFAULT_METEOR_CONFIG.trailScaleFalloff,
  trailStepDivisor = DEFAULT_METEOR_CONFIG.trailStepDivisor,
}) {
  if (
    !THREE ||
    !scene ||
    !meteorTemplate ||
    !meteorHeadMaterial ||
    !meteorHeadAltMaterial ||
    !meteorTailMaterial ||
    !Number.isFinite(maxDistance) ||
    !Number.isFinite(speed)
  ) {
    return null;
  }

  const headMaterialRef = resolveSpriteMaterial(meteorHeadMaterial);
  const headAltMaterialRef = resolveSpriteMaterial(meteorHeadAltMaterial);
  const tailMaterialRef = resolveSpriteMaterial(meteorTailMaterial);
  if (!headMaterialRef || !headAltMaterialRef || !tailMaterialRef) {
    return null;
  }

  const headColor = new THREE.Color(0xffffff);
  const headAltColor = new THREE.Color(0xffffff);
  const tailColor = new THREE.Color(0xffffff);
  if (headMaterialRef.color) headColor.copy(headMaterialRef.color);
  if (headAltMaterialRef.color) headAltColor.copy(headAltMaterialRef.color);
  if (tailMaterialRef.color) tailColor.copy(tailMaterialRef.color);

  const meteorRenderOrder = Math.max(
    meteorHeadMaterial.renderOrder ?? 0,
    meteorHeadAltMaterial.renderOrder ?? 0,
    meteorTailMaterial.renderOrder ?? 0,
  );

  const pointTexture = createMeteorPointTexture(THREE);
  const meteorPointsMaterial = createMeteorPointsMaterial(THREE, pointTexture);

  const maxDistanceSq = maxDistance * maxDistance;
  const toCenter = new THREE.Vector3();

  function spawnMeteor(baseSize) {
    const spacingScale = 0.8;
    const sizeVariationScale = 0.8;
    const adjustedTrailFalloff =
      1 - (1 - trailScaleFalloff) * sizeVariationScale;

    let size = baseSize * (Math.random() * sizeScaleRange + sizeScaleMin);
    const originalSize = size;
    const meteorObject3D = meteorTemplate.clone();

    let x = (Math.random() - 0.5) * maxDistance;
    let y = Math.random() * spawnYRange + spawnYMin;
    const radialRemainingSq = Math.max(0, maxDistanceSq - x * x - y * y);
    let z = Math.sqrt(radialRemainingSq) * (Math.random() > 0.5 ? 1 : -1);

    const velocity = new THREE.Vector3();
    let centerDot = 0;
    while (true) {
      velocity
        .set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5)
        .normalize();
      toCenter.set(-x, -y, -z).normalize();
      centerDot = toCenter.dot(velocity);
      if (
        !(
          (velocity.y < 0 && y < 500) ||
          centerDot < centerDotMin ||
          centerDot > centerDotMax ||
          (z < 0 && velocity.z < 0)
        )
      ) {
        break;
      }
    }

    const originX = x;
    const originY = y;
    const originZ = z;
    const positions = [];
    const pointSizes = [];
    const pointAlphas = [];
    const pointColors = [];

    const pushPoint = (px, py, pz, psize, palpha, r, g, b) => {
      positions.push(px, py, pz);
      pointSizes.push(psize);
      pointAlphas.push(palpha);
      pointColors.push(r, g, b);
    };

    for (let i = 0; i < initialHeadCount; i++) {
      const isPrimaryHead = i % 2 === 0;
      const headSizeMultiplier =
        1 + ((1.15 - i * 0.08) - 1) * sizeVariationScale;
      pushPoint(
        x - originX,
        y - originY,
        z - originZ,
        size * headSizeMultiplier,
        1 - i * 0.08,
        isPrimaryHead ? headColor.r : headAltColor.r,
        isPrimaryHead ? headColor.g : headAltColor.g,
        isPrimaryHead ? headColor.b : headAltColor.b,
      );

      x -= ((size * velocity.x) / initialStepDivisor) * spacingScale;
      y -= ((size * velocity.y) / initialStepDivisor) * spacingScale;
      z -= ((size * velocity.z) / initialStepDivisor) * spacingScale;
    }

    const trailDenominator = Math.max(0.0001, originalSize - trailEndSize);
    while (size > trailEndSize) {
      const sizeFactor = Math.max(
        trailMinScaleFactor,
        Math.pow(size / originalSize, 0.25),
      );
      const bodySizeMultiplier = 1 + (sizeFactor - 1) * sizeVariationScale;
      const progress = (originalSize - size) / trailDenominator;
      const fade = 1 - progress;
      const blend = Math.min(1, progress * 0.9 + 0.1);

      const mixedR = headColor.r + (tailColor.r - headColor.r) * blend;
      const mixedG = headColor.g + (tailColor.g - headColor.g) * blend;
      const mixedB = headColor.b + (tailColor.b - headColor.b) * blend;

      pushPoint(
        x - originX,
        y - originY,
        z - originZ,
        size * bodySizeMultiplier,
        Math.max(0.08, fade * fade * 0.9),
        mixedR,
        mixedG,
        mixedB,
      );

      const tailSizeMultiplier = 1 + (1.02 - 1) * sizeVariationScale;
      pushPoint(
        x - originX,
        y - originY,
        z - originZ,
        size * tailSizeMultiplier,
        Math.max(0.03, fade * fade * 0.35),
        tailColor.r,
        tailColor.g,
        tailColor.b,
      );

      x -= ((size * velocity.x) / trailStepDivisor) * spacingScale;
      y -= ((size * velocity.y) / trailStepDivisor) * spacingScale;
      z -= ((size * velocity.z) / trailStepDivisor) * spacingScale;
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
    meteorPoints.renderOrder = meteorRenderOrder;
    meteorPoints.frustumCulled = false;
    meteorPoints.position.set(0, 0, 0);
    meteorObject3D.add(meteorPoints);
    meteorObject3D.position.set(originX, originY, originZ);

    return [meteorObject3D, velocity];
  }

  function moveMeteor(meteorEntry) {
    const meteorObject = meteorEntry[0];
    const meteorVelocity = meteorEntry[1];
    if (meteorObject.position.lengthSq() > maxDistanceSq) {
      scene.remove(meteorObject);
      meteorObject.traverse((node) => {
        if (node.geometry && typeof node.geometry.dispose === 'function') {
          node.geometry.dispose();
        }
      });
      return true;
    }
    meteorObject.position.addScaledVector(meteorVelocity, speed);
    return false;
  }

  function updateMeteorites(meteorites, maxCount, spawnSize) {
    const targetCount = Math.max(0, Math.floor(Number(maxCount) || 0));
    const nextSpawnSize = Number(spawnSize) || 0;

    if (meteorites.length < targetCount && nextSpawnSize > 0) {
      const meteorEntry = spawnMeteor(nextSpawnSize);
      meteorites.push(meteorEntry);
      scene.add(meteorEntry[0]);
    }

    for (let i = meteorites.length - 1; i >= 0; i--) {
      if (moveMeteor(meteorites[i])) {
        meteorites.splice(i, 1);
      }
    }
  }

  return {
    spawnMeteor,
    moveMeteor,
    updateMeteorites,
  };
}
