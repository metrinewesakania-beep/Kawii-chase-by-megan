
 // src/controls.js
 // KAWIIS CHASE WITH MEGAN — mobile swipe + double-tap controls

export function createControls({
  onAction,
  onPause,
  elements = {}
} = {}) {
  if (typeof onAction !== "function") {
    throw new Error("createControls requires onAction(callback)");
  }

  const listeners = [];
  const held = { left: false, right: false };
  const locked = {
    jump: false,
    slide: false,
    trick: false
  };

  let lastTapTime = 0;
  let startX = 0;
  let startY = 0;
  let startTime = 0;
  let activePointerId = null;

  const SWIPE_THRESHOLD = 35;
  const MAX_GESTURE_MS = 700;
  const DOUBLE_TAP_MS = 320;

  function safeCall(callback, value) {
    try {
      if (typeof callback === "function") callback(value);
    } catch (error) {
      console.error("Control callback failed:", error);
    }
  }

  function listen(target, type, handler, options) {
    if (!target) return;

    target.addEventListener(type, handler, options);
    listeners.push(() => {
      target.removeEventListener(type, handler, options);
    });
  }

  function isUI(target) {
    return !!target?.closest?.(
      "button, input, select, textarea, a, #mobile-controls"
    );
  }

  function bindButton(element, action, repeatable = false) {
    if (!element) return;

    const down = event => {
      if (event.cancelable) event.preventDefault();

      if (repeatable) {
        if (!held[action]) {
          held[action] = true;
          safeCall(onAction, action);
        }
      } else if (!locked[action]) {
        locked[action] = true;
        safeCall(onAction, action);
      }
    };

    const up = () => {
      if (repeatable) held[action] = false;
      else locked[action] = false;
    };

    listen(element, "pointerdown", down, { passive: false });
    listen(element, "pointerup", up);
    listen(element, "pointercancel", up);
    listen(element, "pointerleave", up);

    listen(element, "keydown", event => {
      if (event.key === "Enter" || event.key === " ") {
        down(event);
      }
    });

    listen(element, "keyup", up);
  }

  // Existing on-screen buttons.
  bindButton(elements.left, "left", true);
  bindButton(elements.right, "right", true);
  bindButton(elements.jump, "jump");
  bindButton(elements.slide, "slide");
  bindButton(elements.trick, "trick");

  // Keyboard controls.
  function onKeyDown(event) {
    const key = (event.key || "").toLowerCase();

    if (key === "p" || event.code === "Escape") {
      event.preventDefault();
      safeCall(onPause);
      return;
    }

    const actions = {
      ArrowLeft: "left",
      ArrowRight: "right",
      ArrowUp: "jump",
      ArrowDown: "slide"
    };

    const action =
      actions[event.code] ||
      ({
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

    if (action === "left" || action === "right") {
      if (!held[action]) {
        held[action] = true;
        safeCall(onAction, action);
      }
    } else if (!locked[action]) {
      locked[action] = true;
      safeCall(onAction, action);
    }
  }

  function onKeyUp(event) {
    const key = (event.key || "").toLowerCase();

    if (key === "a" || event.code === "ArrowLeft") {
      held.left = false;
    }

    if (key === "d" || event.code === "ArrowRight") {
      held.right = false;
    }

    if (
      key === " " || key === "w" ||
      event.code === "ArrowUp"
    ) locked.jump = false;

    if (
      key === "s" ||
      event.code === "ArrowDown"
    ) locked.slide = false;

    if (key === "t" || key === "e") {
      locked.trick = false;
    }
  }

  listen(window, "keydown", onKeyDown, { passive: false });
  listen(window, "keyup", onKeyUp);

  // Touchscreen and mouse gestures through Pointer Events.
  const canvas = document.querySelector("#glcanvas");

  function onPointerDown(event) {
    if (isUI(event.target)) {
      lastTapTime = 0;
      return;
    }

    if (activePointerId !== null) return;

    activePointerId = event.pointerId;
    startX = event.clientX;
    startY = event.clientY;
    startTime = performance.now();

    try {
      canvas?.setPointerCapture?.(event.pointerId);
    } catch (_) {}
  }

  function onPointerUp(event) {
    if (event.pointerId !== activePointerId) return;

    const dx = event.clientX - startX;
    const dy = event.clientY - startY;
    const duration = performance.now() - startTime;

    activePointerId = null;

    if (duration > MAX_GESTURE_MS) {
      lastTapTime = 0;
      return;
    }

    // Horizontal swipe: change lanes.
    if (
      Math.abs(dx) > SWIPE_THRESHOLD &&
      Math.abs(dx) > Math.abs(dy)
    ) {
      lastTapTime = 0;
      safeCall(onAction, dx < 0 ? "left" : "right");
      return;
    }

    // Vertical swipe: jump or slide.
    if (
      Math.abs(dy) > SWIPE_THRESHOLD &&
      Math.abs(dy) > Math.abs(dx)
    ) {
      lastTapTime = 0;
      safeCall(onAction, dy < 0 ? "jump" : "slide");
      return;
    }

    // Two quick taps activate the charged power-up.
    if (
      Math.abs(dx) < 20 &&
      Math.abs(dy) < 20
    ) {
      const now = performance.now();

      if (lastTapTime && now - lastTapTime <= DOUBLE_TAP_MS) {
        lastTapTime = 0;
        safeCall(onAction, "powerup");
      } else {
        lastTapTime = now;
      }
    }
  }

  function onPointerCancel(event) {
    if (event.pointerId === activePointerId) {
      activePointerId = null;
      lastTapTime = 0;
    }
  }

  if (canvas) {
    listen(canvas, "pointerdown", onPointerDown, {
      passive: false
    });
    listen(canvas, "pointerup", onPointerUp);
    listen(canvas, "pointercancel", onPointerCancel);

    const previousTouchAction = canvas.style.touchAction;
    canvas.style.touchAction = "none";

    listeners.push(() => {
      canvas.style.touchAction = previousTouchAction;
    });
  }

  function clearHeld() {
    held.left = false;
    held.right = false;

    locked.jump = false;
    locked.slide = false;
    locked.trick = false;

    activePointerId = null;
    lastTapTime = 0;
  }

  listen(window, "blur", clearHeld);
  listen(document, "visibilitychange", () => {
    if (document.hidden) clearHeld();
  });

  function dispose() {
    clearHeld();

    for (const remove of listeners.splice(0)) {
      try {
        remove();
      } catch (_) {}
    }
  }

  return { dispose };
}
