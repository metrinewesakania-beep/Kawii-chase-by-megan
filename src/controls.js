// src/controls.js
// Input handling for mouse, touch, and keyboard
export function createControls({ onAction, onPause, elements = {} } = {}) {
  if (typeof onAction !== "function") throw new Error("createControls requires onAction(callback)");

  const state = { jumpLocked: false, slideLocked: false, trickLocked: false };
  const keyHeld = { left: false, right: false };
  const listeners = [];

  function safeCall(cb, payload) {
    try {
      if (typeof cb === "function") cb(payload);
    } catch (e) {
      console.error("control callback failed", e);
    }
  }

  function bindButton(el, action, hold = false) {
    if (!el) return;

    const onDown = (event) => {
      event.preventDefault();
      if (hold) {
        if (!keyHeld[action]) {
          keyHeld[action] = true;
          safeCall(onAction, action);
        }
      } else {
        if (!state[`${action}Locked`]) {
          state[`${action}Locked`] = true;
          safeCall(onAction, action);
        }
      }
    };

    const onUp = () => {
      if (hold) keyHeld[action] = false;
      else state[`${action}Locked`] = false;
    };

    el.addEventListener("pointerdown", onDown, { passive: false });
    el.addEventListener("pointerup", onUp, { passive: true });
    el.addEventListener("pointerleave", onUp, { passive: true });
    el.addEventListener("pointercancel", onUp, { passive: true });

    const keyHandler = (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        onDown(event);
        setTimeout(onUp, 120);
      }
    };
    el.addEventListener("keydown", keyHandler);

    listeners.push(() => {
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointerleave", onUp);
      el.removeEventListener("pointercancel", onUp);
      el.removeEventListener("keydown", keyHandler);
    });
  }

  bindButton(elements.left, "left", true);
  bindButton(elements.right, "right", true);
  bindButton(elements.jump, "jump", false);
  bindButton(elements.slide, "slide", false);
  bindButton(elements.trick, "trick", false);

  function onKeyDown(event) {
    const key = (event.key || "").toLowerCase();
    if (key === "p" || event.code === "Escape") {
      event.preventDefault();
      if (typeof onPause === "function") onPause();
      return;
    }

    if (key === "a" || event.code === "ArrowLeft") {
      if (!keyHeld.left) {
        keyHeld.left = true;
        safeCall(onAction, "left");
      }
      event.preventDefault();
      return;
    }

    if (key === "d" || event.code === "ArrowRight") {
      if (!keyHeld.right) {
        keyHeld.right = true;
        safeCall(onAction, "right");
      }
      event.preventDefault();
      return;
    }

    if (key === " " || key === "w" || event.code === "ArrowUp") {
      if (!state.jumpLocked) {
        state.jumpLocked = true;
        safeCall(onAction, "jump");
      }
      event.preventDefault();
      return;
    }

    if (key === "s" || event.code === "ArrowDown") {
      if (!state.slideLocked) {
        state.slideLocked = true;
        safeCall(onAction, "slide");
      }
      event.preventDefault();
      return;
    }

    if (key === "t" || key === "e") {
      if (!state.trickLocked) {
        state.trickLocked = true;
        safeCall(onAction, "trick");
      }
      event.preventDefault();
    }
  }

  function onKeyUp(event) {
    const key = (event.key || "").toLowerCase();
    if (key === "a" || event.code === "ArrowLeft") keyHeld.left = false;
    if (key === "d" || event.code === "ArrowRight") keyHeld.right = false;
    if (key === " " || key === "w" || event.code === "ArrowUp") state.jumpLocked = false;
    if (key === "s" || event.code === "ArrowDown") state.slideLocked = false;
    if (key === "t" || key === "e") state.trickLocked = false;
  }

  window.addEventListener("keydown", onKeyDown, { passive: false });
  window.addEventListener("keyup", onKeyUp, { passive: true });
  listeners.push(() => {
    window.removeEventListener("keydown", onKeyDown);
    window.removeEventListener("keyup", onKeyUp);
  });

  // Swipe gesture support for touch devices
  let touchStartX = 0;
  let touchStartY = 0;
  let touchStartTime = 0;

  function onTouchStart(event) {
    if (!event.touches || !event.touches[0]) return;
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
    touchStartTime = performance.now();
  }

  function onTouchEnd(event) {
    if (!event.changedTouches || !event.changedTouches[0]) return;
    const dx = event.changedTouches[0].clientX - touchStartX;
    const dy = event.changedTouches[0].clientY - touchStartY;
    const dt = performance.now() - touchStartTime;
    if (dt > 700) return;

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
      if (dx < 0) safeCall(onAction, "left");
      else safeCall(onAction, "right");
      return;
    }

    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 30) {
      if (dy < 0) safeCall(onAction, "jump");
      else safeCall(onAction, "slide");
    }
  }

  window.addEventListener("touchstart", onTouchStart, { passive: true });
  window.addEventListener("touchend", onTouchEnd, { passive: false });
  listeners.push(() => {
    window.removeEventListener("touchstart", onTouchStart);
    window.removeEventListener("touchend", onTouchEnd);
  });

  // Prevent page scrolling while interacting with the canvas
  const canvas = document.querySelector("canvas#glcanvas");
  if (canvas) {
    const doPrevent = (event) => {
      if (event.cancelable) event.preventDefault();
    };
    canvas.addEventListener("touchmove", doPrevent, { passive: false });
    listeners.push(() => canvas.removeEventListener("touchmove", doPrevent));
  }

  function dispose() {
    for (const fn of listeners) {
      try { fn(); } catch (e) {}
    }
  }

  return { dispose };
}
