export function createTouchRockerControls({
  moveDeadzone,
  lookDeadzone,
  lookScale,
  rockerTravelRatio,
  tapMaxDuration,
  tapMaxMove,
  isGameplayActive,
  onMoveAxis,
  onLookAxis,
  onTap,
}) {
  const state = {
    initialized: false,
    overlay: null,
    move: {
      stick: null,
      knob: null,
      touchId: null,
      maxOffset: 1,
    },
    look: {
      stick: null,
      knob: null,
      touchId: null,
      maxOffset: 1,
    },
    tapCandidates: new Map(),
  };

  function applyMoveAxis(axisX, axisY) {
    const horizontal = Math.abs(axisX) > moveDeadzone ? axisX : 0;
    const vertical = Math.abs(axisY) > moveDeadzone ? axisY : 0;
    const strength = Math.min(1, Math.hypot(horizontal, vertical));
    onMoveAxis(horizontal, vertical, strength);
  }

  function applyLookAxis(axisX, axisY) {
    const horizontal = Math.abs(axisX) > lookDeadzone ? axisX : 0;
    const vertical = Math.abs(axisY) > lookDeadzone ? axisY : 0;
    onLookAxis(horizontal * lookScale, vertical * lookScale);
  }

  function setRockerKnobPosition(knob, offsetX, offsetY) {
    if (!knob) return;
    knob.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }

  function getRockerMaxOffset(stick) {
    if (!stick) return 1;

    const stickRect = stick.getBoundingClientRect();
    let stickSize = Math.min(stickRect.width, stickRect.height);
    if (!stickSize) {
      const stickStyle = window.getComputedStyle(stick);
      stickSize = Math.min(
        parseFloat(stickStyle.width) || 0,
        parseFloat(stickStyle.height) || 0,
      );
    }

    if (!stickSize) return 1;
    return Math.max(1, (stickSize / 2) * rockerTravelRatio);
  }

  function resetMoveTouchState() {
    state.move.touchId = null;
    applyMoveAxis(0, 0);
    setRockerKnobPosition(state.move.knob, 0, 0);
  }

  function resetLookTouchState() {
    state.look.touchId = null;
    applyLookAxis(0, 0);
    setRockerKnobPosition(state.look.knob, 0, 0);
  }

  function isTouchInsideElement(touch, element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    return (
      touch.clientX >= rect.left &&
      touch.clientX <= rect.right &&
      touch.clientY >= rect.top &&
      touch.clientY <= rect.bottom
    );
  }

  function setRockerAxisFromTouch(control, touch, applyAxis) {
    if (!control.stick || !control.knob) return;
    const rect = control.stick.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = touch.clientX - centerX;
    const deltaY = touch.clientY - centerY;
    const distance = Math.hypot(deltaX, deltaY);
    const maxOffset = control.maxOffset || 1;
    const clampedScale = distance > maxOffset ? maxOffset / distance : 1;
    const offsetX = deltaX * clampedScale;
    const offsetY = deltaY * clampedScale;

    setRockerKnobPosition(control.knob, offsetX, offsetY);
    applyAxis(offsetX / maxOffset, offsetY / maxOffset);
  }

  function updateLayout() {
    if (!state.initialized) return;

    const overlay = state.overlay;
    if (overlay && overlay.style.display === 'none') {
      return;
    }

    state.move.maxOffset = getRockerMaxOffset(state.move.stick);
    state.look.maxOffset = getRockerMaxOffset(state.look.stick);
  }

  function updateVisibility() {
    if (!state.overlay) return;
    const active = isGameplayActive();
    const wasVisible = state.overlay.style.display === 'block';
    state.overlay.style.display = active ? 'block' : 'none';
    if (active && !wasVisible) {
      requestAnimationFrame(updateLayout);
    }
    if (!active) {
      if (state.move.touchId !== null) {
        resetMoveTouchState();
      }
      if (state.look.touchId !== null) {
        resetLookTouchState();
      }
      state.tapCandidates.clear();
    }
  }

  function registerTapCandidate(touch) {
    state.tapCandidates.set(touch.identifier, {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: performance.now(),
      moved: false,
    });
  }

  function updateTapCandidate(touch) {
    const candidate = state.tapCandidates.get(touch.identifier);
    if (!candidate) return;
    const deltaX = touch.clientX - candidate.startX;
    const deltaY = touch.clientY - candidate.startY;
    if (Math.hypot(deltaX, deltaY) > tapMaxMove) {
      candidate.moved = true;
    }
  }

  function clearTapCandidate(touch, allowSelection) {
    const candidate = state.tapCandidates.get(touch.identifier);
    if (!candidate) return false;

    state.tapCandidates.delete(touch.identifier);
    if (!allowSelection) return false;

    const elapsed = performance.now() - candidate.startTime;
    const deltaX = touch.clientX - candidate.startX;
    const deltaY = touch.clientY - candidate.startY;
    const moved = candidate.moved || Math.hypot(deltaX, deltaY) > tapMaxMove;
    if (moved || elapsed > tapMaxDuration) return false;

    onTap(touch.clientX, touch.clientY);
    return true;
  }

  function handleTouchStart(event) {
    if (!state.initialized || !isGameplayActive()) return;
    updateLayout();

    let consumed = false;
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const inMoveRocker = isTouchInsideElement(touch, state.move.stick);
      const inLookRocker = isTouchInsideElement(touch, state.look.stick);

      if (inMoveRocker && state.move.touchId === null) {
        state.move.touchId = touch.identifier;
        setRockerAxisFromTouch(state.move, touch, applyMoveAxis);
        consumed = true;
        continue;
      }

      if (inLookRocker && state.look.touchId === null) {
        state.look.touchId = touch.identifier;
        setRockerAxisFromTouch(state.look, touch, applyLookAxis);
        consumed = true;
        continue;
      }

      if (!inMoveRocker && !inLookRocker) {
        registerTapCandidate(touch);
      }
    }

    if (consumed) {
      event.preventDefault();
    }
  }

  function handleTouchMove(event) {
    if (!state.initialized) return;

    let consumed = false;
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch.identifier === state.move.touchId) {
        setRockerAxisFromTouch(state.move, touch, applyMoveAxis);
        consumed = true;
        continue;
      }

      if (touch.identifier === state.look.touchId) {
        setRockerAxisFromTouch(state.look, touch, applyLookAxis);
        consumed = true;
        continue;
      }

      updateTapCandidate(touch);
    }

    if (consumed || isGameplayActive()) {
      event.preventDefault();
    }
  }

  function handleTouchEndInternal(event, allowSelection) {
    if (!state.initialized) return;

    let consumed = false;
    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      if (touch.identifier === state.move.touchId) {
        resetMoveTouchState();
        consumed = true;
        continue;
      }

      if (touch.identifier === state.look.touchId) {
        resetLookTouchState();
        consumed = true;
        continue;
      }

      const selected = clearTapCandidate(
        touch,
        allowSelection && isGameplayActive(),
      );
      consumed = consumed || selected;
    }

    if (consumed || isGameplayActive()) {
      event.preventDefault();
    }
  }

  function handleTouchEnd(event) {
    handleTouchEndInternal(event, true);
  }

  function handleTouchCancel(event) {
    handleTouchEndInternal(event, false);
  }

  function setup() {
    if (state.initialized) return;

    state.overlay = document.getElementById('touch-controls');
    state.move.stick = document.getElementById('move-rocker');
    state.move.knob = document.getElementById('move-rocker-knob');
    state.look.stick = document.getElementById('look-rocker');
    state.look.knob = document.getElementById('look-rocker-knob');

    if (
      !state.overlay ||
      !state.move.stick ||
      !state.move.knob ||
      !state.look.stick ||
      !state.look.knob
    ) {
      return;
    }

    state.initialized = true;
    updateLayout();
    resetMoveTouchState();
    resetLookTouchState();
    updateVisibility();

    window.addEventListener('resize', updateLayout);
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    window.addEventListener('touchcancel', handleTouchCancel, {
      passive: false,
    });
  }

  function isMoveTouchActive() {
    return state.move.touchId !== null;
  }

  return {
    state,
    setup,
    updateVisibility,
    isMoveTouchActive,
  };
}
