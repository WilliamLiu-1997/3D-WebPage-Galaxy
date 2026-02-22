export function updateUfoControlState({
  moveForward,
  moveBackward,
  moveLeft,
  moveRight,
  cameraPositionVec,
  cameraDirectionVec,
  currentSpeedForward,
  currentSpeedRight,
  forwardDirection,
  rightDirection,
  delta,
  acceleration,
  maxSpeedForward,
  maxSpeedRight,
  leftInput,
  rightInput,
  upInput,
  downInput,
  angleX,
  angleY,
  fpsScale,
  ufoScale,
  scaling,
  yawDivisor,
  pitchUpDivisor,
  pitchDownDivisor,
}) {
  if (moveForward && !moveBackward) {
    if (!forwardDirection && currentSpeedForward !== 0) {
      cameraPositionVec.z -= cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y -= cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x -= cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.max(
        0,
        currentSpeedForward - delta * acceleration,
      );
    } else {
      cameraPositionVec.z += cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y += cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x += cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.min(
        maxSpeedForward,
        currentSpeedForward + delta * acceleration,
      );
      forwardDirection = true;
    }
  } else if (moveBackward && !moveForward) {
    if (forwardDirection && currentSpeedForward !== 0) {
      cameraPositionVec.z += cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y += cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x += cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.max(
        0,
        currentSpeedForward - delta * acceleration,
      );
    } else {
      cameraPositionVec.z -= cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y -= cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x -= cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.min(
        maxSpeedForward,
        currentSpeedForward + delta * acceleration,
      );
      forwardDirection = false;
    }
  }

  if (moveRight && !moveLeft) {
    if (!rightDirection && currentSpeedRight !== 0) {
      cameraPositionVec.x += cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z -= cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.max(0, currentSpeedRight - delta * acceleration);
    } else {
      cameraPositionVec.x -= cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z += cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.min(
        maxSpeedRight,
        currentSpeedRight + delta * acceleration,
      );
      rightDirection = true;
    }
  } else if (moveLeft && !moveRight) {
    if (rightDirection && currentSpeedRight !== 0) {
      cameraPositionVec.x -= cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z += cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.max(0, currentSpeedRight - delta * acceleration);
    } else {
      cameraPositionVec.x += cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z -= cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.min(
        maxSpeedRight,
        currentSpeedRight + delta * acceleration,
      );
      rightDirection = false;
    }
  }

  if ((!moveBackward && !moveForward) || (moveBackward && moveForward)) {
    if (forwardDirection) {
      cameraPositionVec.z += cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y += cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x += cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.max(
        0,
        currentSpeedForward - delta * acceleration,
      );
    } else {
      cameraPositionVec.z -= cameraDirectionVec.z * currentSpeedForward;
      cameraPositionVec.y -= cameraDirectionVec.y * currentSpeedForward;
      cameraPositionVec.x -= cameraDirectionVec.x * currentSpeedForward;
      currentSpeedForward = Math.max(
        0,
        currentSpeedForward - delta * acceleration,
      );
    }
  }

  if ((!moveRight && !moveLeft) || (moveRight && moveLeft)) {
    if (rightDirection) {
      cameraPositionVec.x -= cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z += cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.max(0, currentSpeedRight - delta * acceleration);
    } else {
      cameraPositionVec.x += cameraDirectionVec.z * currentSpeedRight;
      cameraPositionVec.z -= cameraDirectionVec.x * currentSpeedRight;
      currentSpeedRight = Math.max(0, currentSpeedRight - delta * acceleration);
    }
  }

  angleX +=
    (leftInput / yawDivisor / Math.PI - rightInput / yawDivisor / Math.PI) *
    fpsScale;
  cameraDirectionVec.x -= (Math.sin(angleX) * ufoScale) / 2;
  cameraDirectionVec.z -= (Math.cos(angleX) * ufoScale) / 2;

  if (cameraDirectionVec.y < 0.85 * ufoScale && !scaling) {
    angleY += (upInput / pitchUpDivisor / Math.PI) * fpsScale * ufoScale;
  }
  if (cameraDirectionVec.y > -0.8 * ufoScale && !scaling) {
    angleY -= (downInput / pitchDownDivisor / Math.PI) * fpsScale * ufoScale;
  }

  cameraDirectionVec.y = Math.sin(angleY) * 60;
  cameraDirectionVec.setLength(2.4 * ufoScale);

  return {
    currentSpeedForward,
    currentSpeedRight,
    forwardDirection,
    rightDirection,
    angleX,
    angleY,
  };
}

export function updateUfoThrustEffect({
  ufo,
  moveForward,
  moveBackward,
  moveLeft,
  moveRight,
  fast,
  fpsScale,
  speed,
}) {
  if (!ufo || !ufo.children || !ufo.children[1]) {
    return speed;
  }

  const isMoving = moveForward || moveBackward || moveRight || moveLeft;
  const thruster = ufo.children[1];

  if (isMoving && !fast) {
    thruster.scale.y =
      ((0.4 - thruster.scale.y) / 50) * fpsScale + thruster.scale.y;
    thruster.material.opacity =
      ((0.8 - thruster.material.opacity) / 50) * fpsScale +
      thruster.material.opacity;
    thruster.position.y =
      ((-0.09 - thruster.position.y) / 50) * fpsScale + thruster.position.y;
    return (2 - speed) / 50 + speed;
  }

  if (isMoving && fast) {
    thruster.scale.y =
      ((0.6 - thruster.scale.y) / 50) * fpsScale + thruster.scale.y;
    thruster.material.opacity =
      ((0.95 - thruster.material.opacity) / 50) * fpsScale +
      thruster.material.opacity;
    thruster.position.y =
      ((-0.15 - thruster.position.y) / 50) * fpsScale + thruster.position.y;
    return (4 - speed) / 50 + speed;
  }

  thruster.scale.y =
    ((0.25 - thruster.scale.y) / 50) * fpsScale + thruster.scale.y;
  thruster.material.opacity =
    ((0.7 - thruster.material.opacity) / 50) * fpsScale +
    thruster.material.opacity;
  thruster.position.y =
    ((-0.04 - thruster.position.y) / 50) * fpsScale + thruster.position.y;
  return (1 - speed) / 50 + speed;
}

export function updateUfoFollowThrustEffect({ ufo, fpsScale, engaged }) {
  if (!ufo || !ufo.children || !ufo.children[1]) {
    return;
  }

  const thruster = ufo.children[1];
  if (engaged) {
    thruster.scale.y =
      ((0.9 - thruster.scale.y) / 50) * fpsScale + thruster.scale.y;
    thruster.material.opacity =
      ((1 - thruster.material.opacity) / 50) * fpsScale +
      thruster.material.opacity;
    thruster.position.y =
      ((-0.2 - thruster.position.y) / 50) * fpsScale + thruster.position.y;
    return;
  }

  thruster.scale.y =
    ((0.25 - thruster.scale.y) / 100) * fpsScale + thruster.scale.y;
  thruster.material.opacity =
    ((0.7 - thruster.material.opacity) / 100) * fpsScale +
    thruster.material.opacity;
  thruster.position.y =
    ((-0.04 - thruster.position.y) / 100) * fpsScale + thruster.position.y;
}

export function setUfoIndicatorColor({ ufo, color }) {
  if (
    !ufo ||
    !ufo.children ||
    !ufo.children[10] ||
    !ufo.children[10].material
  ) {
    return;
  }

  ufo.children[10].material.color.set(color);
  ufo.children[10].material.specular.set(color);
  ufo.children[10].material.emissive.set(color);
}

export function updateUfoStarlightVisuals({ ufo, ufoStarlight }) {
  if (!ufo || !ufo.children) {
    return;
  }

  if (ufo.children[3]) {
    ufo.children[3].scale.set(ufoStarlight * 5, (ufoStarlight * 25) / 6);
  }
  if (ufo.children[11]) {
    ufo.children[11].intensity = ufoStarlight * 20 - 0.5;
  }
  if (ufo.children[12]) {
    ufo.children[12].intensity = ufoStarlight * 20 + 1;
  }
}

export function stepUfoStarlight({ ufo, ufoStarlight, fpsScale, increase }) {
  const nextStarlight = increase
    ? Math.min(ufoStarlight + 0.0002 * fpsScale, 0.08)
    : Math.max(ufoStarlight - 0.0002 * fpsScale, 0.06);

  updateUfoStarlightVisuals({
    ufo,
    ufoStarlight: nextStarlight,
  });
  return nextStarlight;
}

export function updateUfoIdleThrustEffect({ ufo, fpsScale }) {
  if (!ufo || !ufo.children || !ufo.children[1]) {
    return;
  }

  const thruster = ufo.children[1];
  thruster.scale.set(
    ((0.05 - thruster.scale.x) / 100) * fpsScale + thruster.scale.x,
    (0.25 - thruster.scale.y) / 100 + thruster.scale.y,
  );
  thruster.material.opacity =
    ((0.7 - thruster.material.opacity) / 100) * fpsScale +
    thruster.material.opacity;
  thruster.position.y =
    ((-0.04 - thruster.position.y) / 100) * fpsScale + thruster.position.y;
}

export function applyUfoHitEffect({
  ufo,
  cameraPositionVec,
  hitDirectionVec,
  hitFrame,
  rotatespeed,
  knockbackDivisor,
  fpsScale,
  speed,
}) {
  if (hitFrame <= 0) {
    return {
      active: false,
      hitFrame,
      speed,
    };
  }

  cameraPositionVec.x +=
    (hitDirectionVec.x * hitFrame * rotatespeed) / knockbackDivisor;
  cameraPositionVec.y +=
    (hitDirectionVec.y * hitFrame * rotatespeed) / knockbackDivisor;
  cameraPositionVec.z +=
    (hitDirectionVec.z * hitFrame * rotatespeed) / knockbackDivisor;

  const phase = (hitFrame * Math.PI) / 7;
  const wobble = hitFrame / 3000;

  if (ufo) {
    ufo.rotation.x = Math.cos(phase) * wobble;
    ufo.rotation.z = Math.sin(phase) * wobble;
    ufo.rotation.y = Math.sin(phase * 0.7) * wobble;
  }

  if (ufo && ufo.children) {
    if (ufo.children[1]) {
      ufo.children[1].scale.set(0, 0);
      ufo.children[1].material.opacity = 0;
      ufo.children[1].position.y = 0.15;
    }
    setUfoIndicatorColor({ ufo, color: 0xff2222 });
  }

  return {
    active: true,
    hitFrame: hitFrame - fpsScale,
    speed: -speed / 20 + speed,
  };
}
