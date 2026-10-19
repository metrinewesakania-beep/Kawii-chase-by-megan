
 // src/main.js — KAWIIS CHASE WITH MEGAN
 // City scrolling, cinematic intro, third-person camera and touch controls.

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
import { createPlayer } from "./player.js";
import { createWorld } from "./world.js";
import { GameEngine } from "./game.js";
import { createControls } from "./controls.js";

const $ = id => document.getElementById(id);

const canvas = $("glcanvas");
const loading = $("loading");
const errorPanel = $("error");
const titleScreen = $("title-screen");
const hud = $("hud");
const mobileControls = $("mobile-controls");
const messagePanel = $("message");
const resumeButton = $("resume-btn");

let renderer;
let camera;
let scene;
let world;
let player;
let engine;
let controls;

let disposed = false;
let previousTime = 0;
let cinematic = null;
let powerupTime = 0;
let powerupTimeout = null;
let overlay = null;

const BEST_KEY = "kawiis-chase-best";

function hide(element) {
  if (element) element.hidden = true;
}

function show(element) {
  if (element) element.hidden = false;
}

function setText(id, value) {
  const element = $(id);
  if (element) element.textContent = String(value);
}

function readBest() {
  try {
    return Number(localStorage.getItem(BEST_KEY)) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    const best = Math.max(
      readBest(),
      Math.floor(Number(score) || 0)
    );
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Storage is optional.
  }
}

function showError(error) {
  console.error("KAWIIS CHASE:", error);
  hide(loading);
  hide(titleScreen);
  hide(hud);
  hide(mobileControls);

  if (errorPanel) {
    errorPanel.textContent =
      "The game could not load. Refresh and try again. " +
      (error?.message || "");
    show(errorPanel);
  }
}

function setupRenderer() {
  if (!canvas) {
    throw new Error("Canvas #glcanvas is missing from index.html.");
  }

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.5)
  );
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.setClearColor(0x100b26, 1);
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x100b26);
  scene.fog = new THREE.Fog(0x100b26, 45, 210);

  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.1,
    600
  );

  camera.position.set(0, 12, 18);

  scene.add(new THREE.HemisphereLight(0xc4eaff, 0x29203c, 2.1));

  const sun = new THREE.DirectionalLight(0xffd2a1, 2.6);
  sun.position.set(-12, 20, 10);
  scene.add(sun);

  const cyan = new THREE.PointLight(0x35eaff, 22, 55);
  cyan.position.set(-5, 5, -12);
  scene.add(cyan);

  const pink = new THREE.PointLight(0xff36c9, 18, 55);
  pink.position.set(6, 4, -25);
  scene.add(pink);
}

function resize() {
  if (!renderer || !camera || disposed) return;

  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio || 1, 1.5)
  );
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  camera.aspect =
    window.innerWidth / Math.max(1, window.innerHeight);

  camera.updateProjectionMatrix();
}

function updateHud() {
  if (!engine) return;

  setText("score-val", Math.floor(engine.score || 0));
  setText("best-val", "∞");
  setText("tokens-val", engine.tokens || 0);

  const fill = $("chaser-fill");
  if (fill) {
    fill.style.width =
      `${Math.max(0, Math.min(100, engine.chase || 0))}%`;
  }
}

function showMessage(title, body, options = {}) {
  setText("message-title", title);
  setText("message-body", body);

  if (resumeButton) {
    resumeButton.hidden = options.showResume === false;
  }

  show(messagePanel);
}

function hideMessage() {
  hide(messagePanel);
}

function createCinematicOverlay() {
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "cinematic-title";

  Object.assign(overlay.style, {
    position: "fixed",
    inset: "0",
    zIndex: "30",
    display: "none",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "column",
    textAlign: "center",
    padding: "24px",
    pointerEvents: "none",
    color: "#fff",
    background:
      "linear-gradient(180deg, rgba(5,7,22,.12), rgba(5,7,22,.65))",
    fontFamily: "system-ui, sans-serif",
    opacity: "0",
    transition: "opacity 350ms ease"
  });

  const eyebrow = document.createElement("div");
  eyebrow.textContent = "A KAWIIS ORIGINAL";
  Object.assign(eyebrow.style, {
    color: "#60f4ff",
    letterSpacing: "0.35em",
    fontSize: "11px",
    fontWeight: "800",
    marginBottom: "12px"
  });

  const heading = document.createElement("h1");
  heading.textContent = "KAWIIS CHASE";
  Object.assign(heading.style, {
    margin: "0",
    fontSize: "clamp(30px, 8vw, 66px)",
    lineHeight: "1.05",
    fontWeight: "1000",
    letterSpacing: "-0.045em",
    textShadow: "0 0 28px rgba(70,230,255,.55)"
  });

  const subtitle = document.createElement("p");
  subtitle.textContent = "WITH MEGAN";
  Object.assign(subtitle.style, {
    color: "#ff7ad9",
    letterSpacing: "0.45em",
    fontWeight: "900",
    fontSize: "clamp(12px, 3vw, 18px)",
    marginTop: "12px"
  });

  const tagline = document.createElement("p");
  tagline.textContent = "THE CITY IS YOURS. THE CHASE IS ON.";
  Object.assign(tagline.style, {
    fontSize: "11px",
    letterSpacing: "0.13em",
    marginTop: "22px",
    color: "#e8e8ff"
  });

  overlay.append(eyebrow, heading, subtitle, tagline);
  document.body.appendChild(overlay);
  return overlay;
}

function showCinematicTitle(visible) {
  const element = createCinematicOverlay();
  element.style.display = visible ? "flex" : "none";

  requestAnimationFrame(() => {
    element.style.opacity = visible ? "1" : "0";
  });
}

function beginCinematic() {
  if (!player || !engine) return;

  hide(titleScreen);
  hideMessage();
  hide(errorPanel);
  hide(hud);
  hide(mobileControls);

  player.move?.(0, 0);
  player.reset?.();
  world?.reset?.();

  // Keep the rider at the world origin; move the city around them.
  if (player.group) {
    player.group.position.z = 0;
  }

  powerupTime = 0;

  cinematic = { time: 0, duration: 5.5 };
  showCinematicTitle(true);

  camera.position.set(-8, 22, 32);
  camera.lookAt(0, 2, -35);
}

function updateCinematic(delta) {
  if (!cinematic || !player) return;

  cinematic.time += delta;

  const raw = Math.min(1, cinematic.time / cinematic.duration);
  const eased = raw * raw * (3 - 2 * raw);

  const start = new THREE.Vector3(-8, 22, 32);
  const end = new THREE.Vector3(
    player.group.position.x,
    player.group.position.y + 4.3,
    player.group.position.z + 9
  );

  camera.position.copy(start.lerp(end, eased));

  const lookStart = new THREE.Vector3(0, 2, -35);
  const lookEnd = new THREE.Vector3(
    player.group.position.x,
    player.group.position.y + 1.2,
    player.group.position.z
  );

  camera.lookAt(lookStart.lerp(lookEnd, eased));

  camera.position.x +=
    Math.sin(cinematic.time * 0.65) * (1 - eased) * 2.5;

  if (cinematic.time >= cinematic.duration) {
    cinematic = null;
    showCinematicTitle(false);

    engine.start();

    if (player.group) player.group.position.z = 0;

    show(hud);
    show(mobileControls);
    updateHud();
  }
}

function updateCamera(delta) {
  if (!camera || !player?.group) return;

  const heading = player.group.rotation.y;

  const targetPosition = new THREE.Vector3(
    player.group.position.x - Math.sin(heading) * 8,
    player.group.position.y + 4.2,
    player.group.position.z + Math.cos(heading) * 8
  );

  camera.position.lerp(
    targetPosition,
    1 - Math.exp(-4 * delta)
  );

  const lookTarget = new THREE.Vector3(
    player.group.position.x + Math.sin(heading) * 3,
    player.group.position.y + 1.2,
    player.group.position.z - Math.cos(heading) * 3
  );

  camera.lookAt(lookTarget);
}

function stopPlayer() {
  player?.move?.(0, 0);
}

function startGame() {
  if (engine) beginCinematic();
}

function restartGame() {
  if (engine) beginCinematic();
}

function togglePause() {
  if (!engine || cinematic) return;

  if (engine.state === "playing") {
    stopPlayer();
    engine.pause();
    showMessage("PAUSED", "Ready when you are.", {
      showResume: true
    });
  } else if (engine.state === "paused") {
    engine.resume();
    hideMessage();
  }
}

function temporaryMessage(title, body) {
  showMessage(title, body, { showResume: false });

  if (powerupTimeout) clearTimeout(powerupTimeout);

  powerupTimeout = setTimeout(() => {
    if (engine?.state === "playing") hideMessage();
  }, 1400);
}

function handleAction(action) {
  if (
    !engine ||
    engine.state !== "playing" ||
    !player ||
    cinematic
  ) {
    return;
  }

  switch (action) {
    case "left":
      player.turn(-1);
      break;

    case "right":
      player.turn(1);
      break;

    case "jump":
      player.jump();
      break;

    case "slide":
      player.slide();
      break;

    case "trick":
      if (player.trick()) engine.addTrick(50);
      break;

    case "powerup":
      if (engine.tokens >= 5 && powerupTime <= 0) {
        engine.tokens -= 5;
        powerupTime = 5;
        engine.invulnerable = Math.max(engine.invulnerable, 5);

        temporaryMessage(
          "POWER-UP!",
          "Temporary protection activated!"
        );
      } else if (engine.tokens < 5) {
        temporaryMessage(
          "COLLECT MORE RINGS",
          "You need 5 rings for a power-up."
        );
      }
      break;
  }

  updateHud();
}

function bindButtons() {
  $("start-btn")?.addEventListener("click", startGame);
  $("restart-btn")?.addEventListener("click", restartGame);
  $("message-restart")?.addEventListener("click", restartGame);

  $("resume-btn")?.addEventListener("click", () => {
    if (engine?.state === "paused") engine.resume();
    hideMessage();
  });

  $("pause-btn")?.addEventListener("click", togglePause);

  $("help-btn")?.addEventListener("click", () => {
    showMessage(
      "HOW TO PLAY",
      "Hold left or right to ride and steer. Swipe up to jump, " +
      "swipe down to slide, and collect rings. Double-tap the " +
      "game area to activate a power-up after collecting 5 rings.",
      { showResume: false }
    );
  });
}

async function boot() {
  try {
    show(loading);
    hide(errorPanel);
    hide(titleScreen);
    hide(hud);
    hide(mobileControls);
    hideMessage();

    setupRenderer();
    setupScene();

    world = await createWorld({ THREE, scene });

    if (disposed) {
      world?.dispose?.();
      renderer?.dispose();
      return;
    }

    player = createPlayer({ THREE, scene });

    const ui = {
      getBest: readBest,
      saveBest,

      setScore: score => {
        setText("score-val", Math.floor(score));
      },

      setBest: () => {
        setText("best-val", "∞");
      },

      setDistance: distance => {
        setText("distance-val", Math.floor(distance));
      },

      setTokens: tokens => {
        setText("tokens-val", tokens);
      },

      setChase: chase => {
        const fill = $("chaser-fill");
        if (fill) {
          fill.style.width =
            `${Math.max(0, Math.min(100, chase))}%`;
        }
      },

      showMessage,
      hideMessage,

      onStateChange: state => {
        if (state === "playing") {
          hideMessage();
        } else {
          stopPlayer();
        }
      }
    };

    engine = new GameEngine({
      THREE,
      scene,
      camera,
      renderer,
      world,
      player,
      ui
    });

    controls = createControls({
      onAction: handleAction,
      onPause: togglePause,

      // Hold left or right to accelerate and steer.
      // Releasing both buttons stops applying throttle.
      onMove: horizontal => {
        if (engine?.state === "playing" && !cinematic) {
          player?.move?.(horizontal, horizontal === 0 ? 0 : 1);
        } else {
          player?.move?.(0, 0);
        }
      },

      elements: {
        left: $("left-btn"),
        right: $("right-btn"),
        jump: $("jump-btn"),
        slide: $("slide-btn"),
        trick: $("trick-btn")
      }
    });

    bindButtons();
    window.addEventListener("resize", resize);

    hide(loading);
    show(titleScreen);
    createCinematicOverlay();

    renderer.setAnimationLoop(time => {
      if (disposed) return;

      const delta = previousTime
        ? Math.min((time - previousTime) / 1000, 0.05)
        : 0;

      previousTime = time;

      if (cinematic) {
        updateCinematic(delta);
      } else if (engine?.state === "playing") {
        // Reset before the update so the rider starts each frame
        // from the same world position.
        if (player?.group) player.group.position.z = 0;

        engine.update(delta);

        // The city scrolls based on the skater's actual speed.
        // Prevent the rider from travelling off the end of the road.
        if (player?.group) player.group.position.z = 0;

        updateCamera(delta);

        if (powerupTime > 0) {
          powerupTime = Math.max(0, powerupTime - delta);
        }

        updateHud();
      }

      renderer.render(scene, camera);
    });
  } catch (error) {
    showError(error);
  }
}

window.addEventListener("pagehide", () => {
  disposed = true;
  window.removeEventListener("resize", resize);

  if (powerupTimeout) clearTimeout(powerupTimeout);

  if (renderer) renderer.setAnimationLoop(null);

  controls?.dispose?.();
  engine?.dispose?.();
  world?.dispose?.();
  renderer?.dispose();
}, { once: true });

boot();
