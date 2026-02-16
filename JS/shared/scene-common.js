export function createFrameConfig(targetFps = 60) {
  const fpsScale = 120 / targetFps;
  return {
    targetFps,
    frameInterval: 1 / targetFps,
    fpsScale,
  };
}

export function isLoadFinished(loadedCount, totalCount) {
  return loadedCount > 0 && loadedCount === totalCount;
}

export function toggleAimingCursor(isOverlayVisible, aimingElementId = "aiming1") {
  const body = document.body;
  const aimingElement = document.getElementById(aimingElementId);
  if (!body || !aimingElement) return;

  if (isOverlayVisible) {
    body.style.cursor = "url(./img/cursor.png),default";
    aimingElement.style.display = "none";
    return;
  }

  body.style.cursor = "none";
  aimingElement.style.display = "block";
}

export function createResizeRendererHandler(renderer, camera, scene) {
  return function resizeRenderer() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    renderer.setSize(width, height);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
  };
}

export function createProgressHandler(onLoaded, label) {
  return function handleProgress(xhr) {
    if (!xhr.lengthComputable) return;
    const percentComplete = (xhr.loaded / xhr.total) * 100;
    console.log(Math.round(percentComplete, 2) + `% downloaded(${label})`);
    if (percentComplete === 100) {
      onLoaded();
    }
  };
}

export function navigateWithFade(pagePath, options = {}) {
  const blockerId = options.blockerId || "blocker";
  const fadeDuration = options.fadeDuration ?? 2500;
  const delay = options.delay ?? 3500;
  const blocker = document.getElementById(blockerId);

  if (blocker) {
    blocker.style.backgroundColor = "rgba(0, 0, 0, 1)";
  }

  if (typeof $ !== "undefined") {
    const blockerSelector = `#${blockerId}`;
    $(blockerSelector).fadeIn(fadeDuration);
  }

  setTimeout(function goNextPage() {
    window.location.href = pagePath;
  }, delay);
}
