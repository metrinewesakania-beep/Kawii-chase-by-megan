// KAWIIS CHASE WITH MEGAN
// Mobile touch controls, keyboard controls, swipes and double-tap power-up.

export function createControls({
  onAction = () => {},
  onPause = () => {},
  onMove = () => {},
  elements = {}
} = {}) {
  let left = false;
  let right = false;
  let jumpLocked = false;
  let slideLocked = false;
  let trickLocked = false;
  let lastTap = 0;
  let touchStartX = 0;
  let touchStartY = 0;
  let disposed = false;

  const cleanups = [];

  function listen(target, event, handler, options) {
    if (!target) return;

    target.addEventListener(event, handler, options);

    cleanups.push(() => {
      target.removeEventListener(event, handler, options);
    });
  }

  function movePlayer() {
    onMove((right ? 1 : 0) - (left ? 1 : 0), 0);
  }

  function setDirection(direction, pressed) {
    if (direction === "left") left = pressed;
    if (direction === "right") right = pressed;
    movePlayer();
  }

  function actionOnce(name) {
    if (disposed) return;

    if (name === "jump") {
      if (jumpLocked) return;
      jumpLocked = true;
    }

    if (name === "slide") {
      if (slideLocked) return;
      slideLocked = true;
    }

    if (name === "trick") {
      if (trickLocked) return;
      trickLocked = true;
    }

    onAction(name);
  }

  function bindHold(button, direction) {
    if (!button) return;

    const start = (event) => {
      event.preventDefault();
      setDirection(direction, true);

      try {
        button.setPointerCapture?.(event.pointerId);
      } catch (_) {}
    };

    const stop = (event) => {
      if (event) event.preventDefault();
      setDirection(direction, false);
    };

    listen(button, "pointerdown", start);
    listen(button, "pointerup", stop);
    listen(button, "pointercancel", stop);
    listen(button, "lostpointercapture", stop);
    listen(button, "contextmenu", (event) => event.preventDefault());
  }

  function bindAction(button, name) {
    if (!button) return;

    const press = (event) => {
      event.preventDefault();
      actionOnce(name);
    };

    const release = () => {
      if (name === "jump") jumpLocked = false;
      if (name === "slide") slideLocked = false;
      if (name === "trick") trickLocked = false;
    };

    listen(button, "pointerdown", press);
    listen(button, "pointerup", release);
    listen(button, "pointercancel", release);
    listen(button, "lostpointercapture", release);
    listen(button, "contextmenu", (event) => event.preventDefault());
  }

  bindHold(elements.left, "left");
  bindHold(elements.right, "right");

  bindAction(elements.jump, "jump");
  bindAction(elements.slide, "slide");
  bindAction(elements.trick, "trick");
  bindAction(elements.power, "power");

  const keysDown = new Set();

  function keyDown(event) {
    const key = event.key.toLowerCase();

    const controlledKeys = [
      "arrowleft", "arrowright", "arrowup", "arrowdown",
      "a", "d", "w", "s", " ", "t", "e", "p", "escape",
      "x", "shift"
    ];

    if (controlledKeys.includes(key)) event.preventDefault();
    if (event.repeat && keysDown.has(key)) return;

    keysDown.add(key);

    if (key === "arrowleft" || key === "a") {
      setDirection("left", true);
    }

    if (key === "arrowright" || key === "d") {
      setDirection("right", true);
    }

    if (key === "arrowup" || key === "w" || key === " ") {
      actionOnce("jump");
    }

    if (key === "arrowdown" || key === "s") {
      actionOnce("slide");
    }

    if (key === "t" || key === "e") {
      actionOnce("trick");
    }

    if (key === "x" || key === "shift") {
      actionOnce("power");
    }

    if (key === "p" || key === "escape") {
      onPause();
    }
  }

  function keyUp(event) {
    const key = event.key.toLowerCase();
    keysDown.delete(key);

    if (key === "arrowleft" || key === "a") {
      setDirection("left", false);
    }

    if (key === "arrowright" || key === "d") {
      setDirection("right", false);
    }

    if (key === "arrowup" || key === "w" || key === " ") {
      jumpLocked = false;
    }

    if (key === "arrowdown" || key === "s") {
      slideLocked = false;
    }

    if (key === "t" || key === "e") {
      trickLocked = false;
    }

    if (key === "x" || key === "shift") {
      trickLocked = false;
    }
  }

  listen(window, "keydown", keyDown);
  listen(window, "keyup", keyUp);

  function clearMovement() {
    left = false;
    right = false;
    keysDown.clear();

    jumpLocked = false;
    slideLocked = false;
    trickLocked = false;

    movePlayer();
  }

  listen(window, "blur", clearMovement);
  listen(document, "visibilitychange", () => {
    if (document.hidden) clearMovement();
  });

  const canvas = document.querySelector("#glcanvas");

  function touchStart(event) {
    const touch = event.changedTouches[0];
    if (!touch) return;

    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
  }

  function touchEnd(event) {
    const touch = event.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - touchStartX;
    const dy = touch.clientY - touchStartY;
    const now = Date.now();

    // Two quick taps activate the power-up.
    if (now - lastTap < 320 && Math.abs(dx) < 25 && Math.abs(dy) < 25) {
      actionOnce("power");
      lastTap = 0;
      return;
    }

    lastTap = now;

    // Ignore tiny movements.
    if (Math.abs(dx) < 30 && Math.abs(dy) < 30) return;

    if (Math.abs(dx) > Math.abs(dy)) {
      actionOnce(dx < 0 ? "left" : "right");
    } else if (dy < 0) {
      actionOnce("jump");
    } else {
      actionOnce("slide");
    }
  }

  if (canvas) {
    listen(canvas, "touchstart", touchStart, { passive: true });
    listen(canvas, "touchend", touchEnd, { passive: true });
  }

  listen(elements.pause, "click", onPause);

  return {
    dispose() {
      if (disposed) return;
      disposed = true;

      clearMovement();

      for (const cleanup of cleanups) cleanup();
      cleanups.length = 0;
    }
  };
}