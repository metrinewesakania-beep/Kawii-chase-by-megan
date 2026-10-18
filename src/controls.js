
 // src/controls.js
 // KAWIIS CHASE WITH MEGAN — mobile and keyboard controls

export function createControls({
  onAction,
  onPause,
  onMove,
  elements = {}
} = {}) {
  if (typeof onAction !== "function") {
    throw new Error("createControls requires onAction(callback)");
  }

  const removers = [];
  const held = { left: false, right: false };
  const locked = { jump: false, slide: false, trick: false };

  const canvas = document.querySelector("#glcanvas");
  const SWIPE = 35;
  const DOUBLE_TAP = 320;

  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let pointerId = null;
  let lastTap = 0;

  function emit(action) {
    onAction(action);
  }

  function emitMove() {
    const horizontal =
      (held.right ? 1 : 0) - (held.left ? 1 : 0);

    if (typeof onMove === "function") {
      onMove(horizontal, 0);
    }
  }

  function listen(target, type, fn, options) {
    if (!target) return;
    target.addEventListener(type, fn, options);
    removers.push(() =>
      target.removeEventListener(type, fn, options)
    );
  }

  function press(action) {
    if (action === "left" || action === "right") {
      if (!held[action]) {
        held[action] = true;
        emit(action);
        emitMove();
      }
      return;
    }

    if (!locked[action]) {
      locked[action] = true;
      emit(action);
    }
  }

  function release(action) {
    if (action === "left" || action === "right") {
      held[action] = false;
      emitMove();
    } else {
      locked[action] = false;
    }
  }

  function bindButton(element, action) {
    if (!element) return;

    listen(element, "pointerdown", event => {
      if (event.cancelable) event.preventDefault();
      press(action);
    }, { passive: false });

    for (const type of [
      "pointerup", "pointercancel", "pointerleave"
    ]) {
      listen(element, type, () => release(action));
    }

    listen(element, "keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        press(action);
      }
    });

    listen(element, "keyup", () => release(action));
  }

  bindButton(elements.left, "left");
  bindButton(elements.right, "right");
  bindButton(elements.jump, "jump");
  bindButton(elements.slide, "slide");
  bindButton(elements.trick, "trick");

  function keyDown(event) {
    const key = event.key.toLowerCase();

    if (key === "p" || event.code === "Escape") {
      event.preventDefault();
      onPause?.();
      return;
    }

    const actions = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "jump",
      ArrowDown: "slide"
    };

    const action = actions[event.code] || ({
      a: "left",
      d: "right",
      w: "jump",
      s: "slide",
      " ": "jump",
      t: "trick",
      e: "trick"
    })[key];

    if (!action) return;
    event.preventDefault();
    press(action);
  }

  function keyUp(event) {
    const key = event.key.toLowerCase();

    if (key === "a" || event.code === "ArrowLeft") {
      release("left");
    }
    if (key === "d" || event.code === "ArrowRight") {
      release("right");
    }
    if (key === "w" || key === " " ||
        event.code === "ArrowUp") release("jump");
    if (key === "s" || event.code === "ArrowDown") {
      release("slide");
    }
    if (key === "t" || key === "e") release("trick");
  }

  listen(window, "keydown", keyDown, { passive: false });
  listen(window, "keyup", keyUp);

  function isUI(target) {
    return !!target?.closest?.(
      "button, input, select, textarea, a, #mobile-controls"
    );
  }

  function pointerDown(event) {
    if (isUI(event.target) || pointerId !== null) return;

    pointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = performance.now();
  }

  function pointerUp(event) {
    if (event.pointerId !== pointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const duration = performance.now() - startTime;
    pointerId = null;

    if (duration > 700) {
      lastTap = 0;
      return;
    }

    if (Math.abs(dx) > SWIPE &&
        Math.abs(dx) > Math.abs(dy)) {
      lastTap = 0;
      emit(dx < 0 ? "left" : "right");
      return;
    }

    if (Math.abs(dy) > SWIPE &&
        Math.abs(dy) > Math.abs(dx)) {
      lastTap = 0;
      emit(dy < 0 ? "jump" : "slide");
      return;
    }

    if (Math.abs(dx) < 20 && Math.abs(dy) < 20) {
      const now = performance.now();

      if (lastTap && now - lastTap <= DOUBLE_TAP) {
        lastTap = 0;
        emit("powerup");
      } else {
        lastTap = now;
      }
    }
  }

  function pointerCancel() {
    pointerId = null;
    lastTap = 0;
  }

  if (canvas) {
    listen(canvas, "pointerdown", pointerDown);
    listen(canvas, "pointerup", pointerUp);
    listen(canvas, "pointercancel", pointerCancel);

    const oldTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";

    removers.push(() => {
      canvas.style.touchAction = oldTouchAction;
    });
  }

  function clearHeld() {
    held.left = false;
    held.right = false;
    locked.jump = false;
    locked.slide = false;
    locked.trick = false;
    pointerId = null;
    lastTap = 0;
    emitMove();
  }

  listen(window, "blur", clearHeld);
  listen(document, "visibilitychange", () => {
    if (document.hidden) clearHeld();
  });

  function dispose() {
    clearHeld();
    for (const remove of removers.splice(0)) remove();
  }

  return { dispose };
}
