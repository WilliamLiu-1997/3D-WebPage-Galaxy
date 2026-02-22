export function updatePointerFromClient(mouseVector, clientX, clientY) {
  mouseVector.x = (clientX / window.innerWidth) * 2 - 1;
  mouseVector.y = -(clientY / window.innerHeight) * 2 + 1;
}

export function isContentHidden(contentElementId = 'content') {
  const content = document.getElementById(contentElementId);
  return Boolean(content && content.style.display == 'none');
}

export function isGameplayActive(contentElementId = 'content', esc = false) {
  return isContentHidden(contentElementId) && !esc;
}

export function getAimingMousePosition(
  aimingElementId = 'aiming1',
  offset = 10,
) {
  const aimingElement = document.getElementById(aimingElementId);
  const x = aimingElement.offsetLeft + offset;
  const y = aimingElement.offsetTop + offset;
  return { x, y };
}

export function computeLookInputFromMousePosition(
  mouseX,
  mouseY,
  viewportWidth,
  viewportHeight,
) {
  let up = 0;
  let down = 0;
  let left = 0;
  let right = 0;

  const normalizedY = mouseY / viewportHeight;
  const normalizedX = mouseX / viewportWidth;

  if (normalizedY < 0.5) {
    up = 0.5 - normalizedY;
  }
  if (normalizedY > 0.62) {
    down = normalizedY - 0.62;
  }
  if (normalizedX < 0.47) {
    left = 0.47 - normalizedX;
  }
  if (normalizedX > 0.53) {
    right = normalizedX - 0.53;
  }

  return { up, down, left, right };
}
