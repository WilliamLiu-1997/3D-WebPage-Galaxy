export function createStarfieldSystem({
  THREE,
  scene,
  starTexture,
  separation,
  amountX,
  amountY,
  amountZ,
  pointBaseSize = 10,
  groupSize = 50,
  moveDivisor = 20,
  colorTints = [
    [0.7, 0.7, 1.0],
    [0.7, 0.7, 1.0],
    [0.7, 0.7, 1.0],
    [1.0, 1.0, 0.7],
  ],
  fadeStartDistance = 1000,
  fadeEndDistance = 800,
  yBaseOffset = 0,
  minYResolver,
  sizeVariationScale = 1,
  sizeVariationPhaseScale = 200,
  randomSpreadMultiplier = 16,
  renderOrder,
}) {
  const starCountMax = amountX * amountY * amountZ;
  const starPositions = new Float32Array(starCountMax * 3);
  const starDx = new Float32Array(starCountMax);
  const starDy = new Float32Array(starCountMax);
  const starDz = new Float32Array(starCountMax);
  const starDsx = new Float32Array(starCountMax);
  const starDsy = new Float32Array(starCountMax);
  const starDsz = new Float32Array(starCountMax);
  const starSSpeed = new Float32Array(starCountMax);
  const starSizes = new Float32Array(starCountMax);
  const starAlphas = new Float32Array(starCountMax);
  const starColors = new Float32Array(starCountMax * 3);

  const starPointMaterial = new THREE.PointsMaterial({
    transparent: true,
    blending: THREE.AdditiveBlending,
    map: starTexture,
    color: 0xffffff,
    vertexColors: true,
    size: pointBaseSize,
    sizeAttenuation: true,
    depthWrite: false,
    alphaTest: 0.01,
  });

  starPointMaterial.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace(
        'uniform float size;',
        'uniform float size;\nattribute float pointSize;\nattribute float pointAlpha;\nvarying float vPointAlpha;',
      )
      .replace(
        'gl_PointSize = size;',
        'gl_PointSize = pointSize;\nvPointAlpha = pointAlpha;',
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
  starPointMaterial.needsUpdate = true;

  let starCount = 0;
  for (let ix = 0; ix < amountX; ix++) {
    for (let iy = 0; iy < amountY; iy++) {
      for (let iz = 0; iz < amountZ; iz++) {
        starDx[starCount] = Math.random() - 0.5;
        starDy[starCount] = Math.random() - 0.5;
        starDz[starCount] = Math.random() - 0.5;
        starDsx[starCount] = Math.random() - 0.5;
        starDsy[starCount] = Math.random() - 0.5;
        starDsz[starCount] = Math.random() - 0.5;
        starSSpeed[starCount] = Math.random() - 0.5;
        starSizes[starCount] = pointBaseSize;
        starAlphas[starCount] = 1;

        const tint = colorTints[Math.floor(Math.random() * colorTints.length)];
        const colorIndex = starCount * 3;
        starColors[colorIndex] = tint[0] + (1 - tint[0]) * Math.random();
        starColors[colorIndex + 1] = tint[1] + (1 - tint[1]) * Math.random();
        starColors[colorIndex + 2] = tint[2] + (1 - tint[2]) * Math.random();

        const positionIndex = starCount * 3;
        const starX =
          ix * separation -
          (amountX * separation) / 2 +
          (Math.random() - 0.5) * separation * randomSpreadMultiplier;
        const starZ =
          iz * separation -
          (amountZ * separation) / 2 +
          (Math.random() - 0.5) * separation * randomSpreadMultiplier;
        let starY =
          (iy * separation) / 2 +
          yBaseOffset +
          (Math.random() - 0.5) * separation * randomSpreadMultiplier;

        if (typeof minYResolver === 'function') {
          starY = Math.max(starY, minYResolver(starX, starZ));
        }

        starPositions[positionIndex] = starX;
        starPositions[positionIndex + 1] = starY;
        starPositions[positionIndex + 2] = starZ;
        starCount++;
      }
    }
  }

  const starGroupOrder = buildRandomStarGroupOrder(starCount);
  const starGroupCount = Math.ceil(starCount / groupSize);
  const fadeRange = fadeStartDistance - fadeEndDistance;
  const fadeStartDistanceSq = fadeStartDistance * fadeStartDistance;
  const fadeEndDistanceSq = fadeEndDistance * fadeEndDistance;

  const starGeometry = new THREE.BufferGeometry();
  const starPositionAttribute = new THREE.BufferAttribute(starPositions, 3);
  starPositionAttribute.setUsage(THREE.DynamicDrawUsage);
  const starSizeAttribute = new THREE.BufferAttribute(starSizes, 1);
  starSizeAttribute.setUsage(THREE.DynamicDrawUsage);
  const starAlphaAttribute = new THREE.BufferAttribute(starAlphas, 1);
  starAlphaAttribute.setUsage(THREE.DynamicDrawUsage);
  const starColorAttribute = new THREE.BufferAttribute(starColors, 3);

  starGeometry.setAttribute('position', starPositionAttribute);
  starGeometry.setAttribute('pointSize', starSizeAttribute);
  starGeometry.setAttribute('pointAlpha', starAlphaAttribute);
  starGeometry.setAttribute('color', starColorAttribute);
  starGeometry.computeBoundingSphere();

  const starPoints = new THREE.Points(starGeometry, starPointMaterial);
  starPoints.userData.ignoreClickFollow = true;
  starPoints.frustumCulled = false;
  if (typeof renderOrder === 'number') {
    starPoints.renderOrder = renderOrder;
  }
  scene.add(starPoints);

  return {
    points: starPoints,
    update(ufoPosition, count) {
      const scaleCount = count * sizeVariationPhaseScale;
      const ufoX = ufoPosition.x;
      const ufoY = ufoPosition.y;
      const ufoZ = ufoPosition.z;

      for (let groupIndex = 0; groupIndex < starGroupCount; groupIndex++) {
        const groupStart = groupIndex * groupSize;
        if (groupStart >= starCount) break;

        const leaderIndex = starGroupOrder[groupStart];
        const leaderOffset = leaderIndex * 3;
        const oldSize = starSizes[leaderIndex];
        const targetSize =
          ((Math.sin(starSSpeed[leaderIndex] * scaleCount) *
            sizeVariationScale +
            3) *
            pointBaseSize) /
          3;

        const deltaX =
          (starDx[leaderIndex] * Math.cos(starDsx[leaderIndex] * count)) /
          moveDivisor;
        const deltaY =
          (starDy[leaderIndex] * Math.cos(starDsy[leaderIndex] * count)) /
          moveDivisor;
        const deltaZ =
          (starDz[leaderIndex] * Math.cos(starDsz[leaderIndex] * count)) /
          moveDivisor;

        starSizes[leaderIndex] = targetSize;
        starPositions[leaderOffset] += deltaX;
        starPositions[leaderOffset + 1] += deltaY;
        starPositions[leaderOffset + 2] += deltaZ;
        starAlphas[leaderIndex] = computeAlphaByDistance(
          starPositions[leaderOffset] - ufoX,
          starPositions[leaderOffset + 1] - ufoY,
          starPositions[leaderOffset + 2] - ufoZ,
          fadeEndDistanceSq,
          fadeStartDistanceSq,
          fadeEndDistance,
          fadeRange,
        );

        const deltaSize = targetSize - oldSize;
        for (
          let member = 1;
          member < groupSize && groupStart + member < starCount;
          member++
        ) {
          const memberIndex = starGroupOrder[groupStart + member];
          const memberOffset = memberIndex * 3;
          starSizes[memberIndex] += deltaSize;
          starPositions[memberOffset] += deltaX;
          starPositions[memberOffset + 1] += deltaY;
          starPositions[memberOffset + 2] += deltaZ;
          starAlphas[memberIndex] = computeAlphaByDistance(
            starPositions[memberOffset] - ufoX,
            starPositions[memberOffset + 1] - ufoY,
            starPositions[memberOffset + 2] - ufoZ,
            fadeEndDistanceSq,
            fadeStartDistanceSq,
            fadeEndDistance,
            fadeRange,
          );
        }
      }

      starGeometry.attributes.position.needsUpdate = true;
      starGeometry.attributes.pointSize.needsUpdate = true;
      starGeometry.attributes.pointAlpha.needsUpdate = true;
    },
  };
}

function buildRandomStarGroupOrder(count) {
  const order = new Uint32Array(count);
  for (let i = 0; i < count; i++) {
    order[i] = i;
  }
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const temp = order[i];
    order[i] = order[j];
    order[j] = temp;
  }
  return order;
}

function computeAlphaByDistance(
  dx,
  dy,
  dz,
  fadeEndDistanceSq,
  fadeStartDistanceSq,
  fadeEndDistance,
  fadeRange,
) {
  const distSq = dx * dx + dy * dy + dz * dz;
  if (distSq <= fadeEndDistanceSq) return 0;
  if (distSq >= fadeStartDistanceSq) return 1;
  return (Math.sqrt(distSq) - fadeEndDistance) / fadeRange;
}
