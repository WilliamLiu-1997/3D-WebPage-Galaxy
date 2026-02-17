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

  const maxDistanceSq = maxDistance * maxDistance;

  function spawnMeteor(baseSize) {
    let size = baseSize * (Math.random() * sizeScaleRange + sizeScaleMin);
    const originalSize = size;
    const meteorObject3D = meteorTemplate.clone();

    let x = (Math.random() - 0.5) * maxDistance;
    let y = Math.random() * spawnYRange + spawnYMin;
    const radialRemainingSq = Math.max(0, maxDistanceSq - x * x - y * y);
    let z = Math.sqrt(radialRemainingSq) * (Math.random() > 0.5 ? 1 : -1);

    const velocity = new THREE.Vector3();
    const toCenter = new THREE.Vector3();
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

    for (let i = 0; i < initialHeadCount; i++) {
      const headSprite = i % 2 === 0
        ? meteorHeadMaterial.clone()
        : meteorHeadAltMaterial.clone();
      headSprite.position.set(x - originX, y - originY, z - originZ);
      headSprite.scale.set(size * 1.15, size * 1.15, 1);
      meteorObject3D.add(headSprite);

      x -= (size * velocity.x) / initialStepDivisor;
      y -= (size * velocity.y) / initialStepDivisor;
      z -= (size * velocity.z) / initialStepDivisor;
    }

    while (size > trailEndSize) {
      const bodySprite = meteorHeadMaterial.clone();
      const sizeFactor = Math.max(
        trailMinScaleFactor,
        Math.pow(size / originalSize, 0.25),
      );
      bodySprite.scale.set(size * sizeFactor, size * sizeFactor, 1);
      bodySprite.position.set(x - originX, y - originY, z - originZ);
      meteorObject3D.add(bodySprite);

      const tailSprite = meteorTailMaterial.clone();
      tailSprite.scale.set(size, size, 1);
      tailSprite.position.set(x - originX, y - originY, z - originZ);
      meteorObject3D.add(tailSprite);

      x -= (size * velocity.x) / trailStepDivisor;
      y -= (size * velocity.y) / trailStepDivisor;
      z -= (size * velocity.z) / trailStepDivisor;
      size *= trailScaleFalloff;
    }

    meteorObject3D.position.set(originX, originY, originZ);
    return [meteorObject3D, velocity];
  }

  function moveMeteor(meteorEntry) {
    const meteorObject = meteorEntry[0];
    const meteorVelocity = meteorEntry[1];
    if (meteorObject.position.lengthSq() > maxDistanceSq) {
      scene.remove(meteorObject);
      return true;
    }
    meteorObject.position.addScaledVector(meteorVelocity, speed);
    return false;
  }

  function updateMeteorites(meteorites, { maxCount, spawnSize }) {
    if (meteorites.length < maxCount) {
      const meteorEntry = spawnMeteor(spawnSize);
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
