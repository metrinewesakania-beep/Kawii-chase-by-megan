// KAWIIS CHASE WITH MEGAN
// Main game entry point.

import * as THREE from "three";
import { createPlayer } from "./player.js";
import { createWorld } from "./world.js";
import { GameEngine } from "./game.js";
import { createControls } from "./controls.js";

const $ = (id) => document.getElementById(id);

const canvas = $("glcanvas");
const loading = $("loading");
const errorPanel = $("error");
const titleScreen = $("title-screen");
const hud = $("hud");
const mobileControls = $("mobile-controls");
const messagePanel = $("message");

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

const BEST_KEY = "kawii-chase-best";
const POWERUP_DURATION = 5;
const POWERUP_COST = 5;

function show(element) {
  element?.classList.remove("hidden");
}

function hide(element) {
  element?.classList.add("hidden");
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
  const best = Math.max(
    readBest(),
    Math.floor(Number(score) || 0)
  );

  try {
    localStorage.setItem(BEST_KEY, String(best));
  } catch {
    // Continue if browser storage is unavailable.
  }

  setText("best-val", best);
  setText("title-best", best);
  return best;
}

function showError(error) {
  console.error("KAWIIS CHASE loading error:", error);

  hide(loading);
  hide(titleScreen);
  hide(hud);
  hide(mobileControls);
  hide(messagePanel);

  const details =
    error instanceof Error ? error.message : String(error || "Unknown error");

  setText(
    "error-text",
    `The game could not load. Check your connection and refresh. Details: ${details}`
  );

  show(errorPanel);
}

function setupRenderer() {
  if (!canvas) {
    throw new Error('Missing canvas element with id "glcanvas".');
  }

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
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

  camera.position.set(0, 8, 12);

  scene.add(
    new THREE.HemisphereLight(0xc4eaff, 0x29203c, 2)
  );

  const sun = new THREE.DirectionalLight(0xffd2a1, 2.2);
  sun.position.set(-12, 20, 10);
  scene.add(sun);

  const cyan = new THREE.PointLight(0x35eaff, 18, 55);
  cyan.position.set(-5, 5, -12);
  scene.add(cyan);

  const pink = new THREE.PointLight(0xff36c9, 14, 55);
  pink.position.set(6, 4, -25);
  scene.add(pink);
}

function resize() {
  if (!renderer || !camera || disposed) return;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);

  camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
  camera.updateProjectionMatrix();
}

function updateHud() {
  if (!engine) return;

  const score = Math.floor(engine.score || 0);
  const best = Math.max(readBest(), score);
  const distance = Math.floor(engine.distance || 0);
  const tokens = Math.floor(engine.tokens || engine.coins || 0);
  const chase = Math.max(
    0,
    Math.min(100, Number(engine.chase) || 0)
  );

  setText("score-val", score);
  setText("best-val", best);
  setText("title-best", readBest());
  setText("dist-val", `${distance} m`);
  setText("coin-val", tokens);

  const chaseFill = $("chaser-fill");
  if (chaseFill) chaseFill.style.width = `${chase}%`;

  setText(
    "chase-text",
    chase >= 80
      ? "Danger! Rivals close!"
      : chase >= 50
        ? "Rivals gaining!"
        : "Keep skating!"
  );

  const powerStatus = $("power-status");
  const powerFill = $("power-fill");

  if (powerupTime > 0) {
    show(powerStatus);
    setText("power-val", "PROTECTION ACTIVE");

    if (powerFill) {
      const percent = Math.max(
        0,
        Math.min(100, (powerupTime / POWERUP_DURATION) * 100)
      );
      powerFill.style.width = `${percent}%`;
    }
  } else {
    hide(powerStatus);
  }
}

function showMessage(title, body, options = {}) {
  setText("message-title", title);
  setText("message-body", body);

  const resumeButton = $("resume-btn");
  const helpContent = $("help-content");
  const closeButton = $("message-close");

  if (resumeButton) {
    resumeButton.textContent = options.resumeLabel || "CONTINUE";
    resumeButton.classList.toggle(
      "hidden",
      options.showResume === false
    );
  }

  if (helpContent) {
    helpContent.classList.toggle(
      "hidden",
      options.showHelp !== true
    );
  }

  if (closeButton) {
    closeButton.classList.toggle(
      "hidden",
      options.showClose !== true
    );
  }

  show(messagePanel);
}

function hideMessage() {
  hide(messagePanel);
  hide($("help-content"));
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
    background: "linear-gradient(180deg, rgba(5,7,22,.12), rgba(5,7,22,.65))",
    fontFamily: "system-ui, sans-serif",
    opacity: "0",
    transition: "opacity 350ms ease"
  });

  const eyebrow = document.createElement("div");
  eyebrow.textContent = "A KAWIIS ORIGINAL";

  Object.assign(eyebrow.style, {
    color: "#60f4ff",
    letterSpacing: "0.3em",
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
    textShadow: "0 0 28px rgba(70,230,255,.55)"
  });

  const subtitle = document.createElement("p");
  subtitle.textContent = "WITH MEGAN";

  Object.assign(subtitle.style, {
    color: "#ff7ad9",
    letterSpacing: "0.4em",
    fontWeight: "900",
    marginTop: "12px"
  });

  const tagline = document.createElement("p");
  tagline.textContent = "THE CITY IS YOURS. THE CHASE IS ON.";

  Object.assign(tagline.style, {
    fontSize: "11px",
    letterSpacing: "0.1em",
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
    if (element) {
      element.style.opacity = visible ? "1" : "0";
    }
  });
}

function beginCinematic() {
  if (!player || !engine || disposed) return;

  hide(titleScreen);
  hideMessage();
  hide(errorPanel);
  hide(hud);
  hide(mobileControls);

  player.move?.(0, 0);
  player.reset?.();
  world?.reset?.();

  if (player.group) player.group.position.z = 0;

  powerupTime = 0;
  cinematic = { time: 0, duration: 5.5 };

  showCinematicTitle(true);

  camera.position.set(-8, 22, 32);
  camera.lookAt(0, 2, -35);
}

function updateCinematic(delta) {
  if (!cinematic || !player?.group) return;

  cinematic.time += delta;

  const progress = Math.min(
    1,
    cinematic.time / cinematic.duration
  );

  const eased = progress * progress * (3 - 2 * progress);

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
  if (engine && engine.state !== "playing") {
    beginCinematic();
  }
}

function restartGame() {
  if (!engine) return;

  engine.restart?.();
  beginCinematic();
}

function togglePause() {
  if (!engine || cinematic) return;

  if (engine.state === "playing") {
    stopPlayer();
    engine.pause();
    showMessage("PAUSED", "Take a breath. Ready when you are.");
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

function activatePowerup() {
  if (!engine || engine.state !== "playing" || cinematic) return;

  if (powerupTime > 0) {
    temporaryMessage(
      "POWER ACTIVE",
      "Your protection is already running."
    );
    return;
  }

  const tokens = Number(engine.tokens ?? engine.coins ?? 0);

  if (tokens < POWERUP_COST) {
    temporaryMessage(
      "COLLECT MORE RINGS",
      `You need ${POWERUP_COST} rings for a power-up.`
    );
    return;
  }

  if ("tokens" in engine) engine.tokens -= POWERUP_COST;
  else engine.coins -= POWERUP_COST;

  powerupTime = POWERUP_DURATION;
  engine.invulnerable = Math.max(
    engine.invulnerable || 0,
    POWERUP_DURATION
  );

  player?.activatePower?.();

  temporaryMessage(
    "POWER-UP!",
    "Temporary protection activated!"
  );

  updateHud();
}

function handleAction(action) {
  if (!engine || engine.state !== "playing" || !player || cinematic) {
    return;
  }

  switch (action) {
    case "left":
      player.turn?.(-1);
      break;

    case "right":
      player.turn?.(1);
      break;

    case "jump":
      player.jump?.();
      break;

    case "slide":
      player.slide?.();
      break;

    case "trick":
      if (player.trick?.()) engine.addTrick?.(50);
      break;

    case "power":
    case "powerup":
      activatePowerup();
      break;
  }

  updateHud();
}

function bindButtons() {
  $("start-btn")?.addEventListener("click", startGame);
  $("message-restart")?.addEventListener("click", restartGame);
  $("pause-btn")?.addEventListener("click", togglePause);
  $("power-btn")?.addEventListener("click", activatePowerup);

  $("reload-btn")?.addEventListener("click", () => {
    window.location.reload();
  });

  $("resume-btn")?.addEventListener("click", () => {
    if (engine?.state === "paused") engine.resume();
    hideMessage();
  });

  $("message-close")?.addEventListener("click", hideMessage);

  $("help-btn")?.addEventListener("click", () => {
    showMessage("HOW TO PLAY", "Use the screen controls or keyboard.", {
      showResume: false,
      showHelp: true,
      showClose: true
    });
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

    engine = new GameEngine({
      THREE,
      scene,
      camera,
      renderer,
      world,
      player,
      ui: {
        getBest: readBest,
        saveBest,
        showMessage,
        hideMessage,
        onGameOver: (result) => {
          saveBest(result.score);

          showMessage(
            "RUN OVER",
            `${result.reason || "The chase is over."}\nScore: ${result.score}\nDistance: ${result.distance} m\nRings: ${result.coins}`,
            { showResume: false, showClose: true }
          );

          show($("message-restart"));
        }
      }
    });

    controls = createControls({
      onAction: handleAction,
      onPause: togglePause,

      onMove: (horizontal) => {
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
        trick: $("trick-btn"),
        power: $("power-btn"),
        pause: $("pause-btn")
      }
    });

    bindButtons();
    window.addEventListener("resize", resize);

    hide(loading);
    show(titleScreen);
    setText("title-best", readBest());

    createCinematicOverlay();

    renderer.setAnimationLoop((time) => {
      if (disposed) return;

      const delta = previousTime
        ? Math.min((time - previousTime) / 1000, 0.05)
        : 0;

      previousTime = time;

      if (cinematic) {
        updateCinematic(delta);
      } else if (engine?.state === "playing") {
        if (player?.group) player.group.position.z = 0;

        // The engine owns the gameplay update loop.
        engine.update?.(delta);

        if (player?.group) player.group.position.z = 0;

        if (powerupTime > 0) {
          powerupTime = Math.max(0, powerupTime - delta);

          if (powerupTime <= 0 && engine) {
            engine.invulnerable = 0;
          }
        }

        updateCamera(delta);
        updateHud();
      }

      renderer.render(scene, camera);
    });
  } catch (error) {
    showError(error);
  }
}

window.addEventListener(
  "pagehide",
  () => {
    disposed = true;

    window.removeEventListener("resize", resize);

    if (powerupTimeout) clearTimeout(powerupTimeout);
    renderer?.setAnimationLoop(null);

    controls?.dispose?.();
    engine?.dispose?.();
    world?.dispose?.();
    renderer?.dispose();
  },
  { once: true }
);

boot();