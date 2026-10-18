
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js";
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
const resumeButton = $("resume-btn");

let renderer;
let camera;
let engine;
let world;
let player;
let controls;
let scene;

let disposed = false;
let buttonsBound = false;
let previousTime = 0;
let steering = 0;
let powerupTime = 0;
let powerupTimeout = null;

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
    return Number(localStorage.getItem("kawiis-chase-best")) || 0;
  } catch {
    return 0;
  }
}

function saveBest(score) {
  try {
    localStorage.setItem(
      "kawiis-chase-best",
      String(Math.max(readBest(), Math.floor(Number(score) || 0)))
    );
  } catch {
    // Local storage may be unavailable.
  }
}

function showError(error) {
  console.error("KAWIIS CHASE WITH MEGAN:", error);
  hide(loading);

  if (errorPanel) {
    errorPanel.textContent =
      "Unable to load the game. Refresh the page and try again. " +
      String(error?.message || error);
    show(errorPanel);
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
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x100b26, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

function setupScene() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x100b26);
  scene.fog = new THREE.Fog(0x100b26, 45, 190);

  camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / Math.max(1, window.innerHeight),
    0.1,
    500
  );

  camera.position.set(0, 5.2, 10);

  scene.add(new THREE.HemisphereLight(0x9cecff, 0x27133f, 2));

  const sun = new THREE.DirectionalLight(0xffc68c, 2.2);
  sun.position.set(-8, 15, 10);
  scene.add(sun);

  const cyan = new THREE.PointLight(0x36eaff, 18, 45);
  cyan.position.set(-5, 4, -15);
  scene.add(cyan);

  const pink = new THREE.PointLight(0xff35cb, 18, 45);
  pink.position.set(5, 4, -28);
  scene.add(pink);
}

function resize() {
  if (!renderer || !camera || disposed) return;

  const width = Math.max(1, window.innerWidth);
  const height = Math.max(1, window.innerHeight);

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

function updateHud() {
  if (!engine) return;

  setText("score-val", Math.floor(engine.score || 0));

  // Display infinity for the high-score label.
  setText("best-val", "∞");

  const fill = $("chaser-fill");
  if (fill) {
    fill.style.width =
      `${Math.max(0, Math.min(100, engine.chase || 0))}%`;
  }

  setText("tokens-val", engine.tokens || 0);
}

function stopPlayer() {
  steering = 0;
  player?.move?.(0, 0);
}

function startGame() {
  if (!engine) return;

  hide(titleScreen);
  hideMessage();
  hide(errorPanel);
  show(hud);
  show(mobileControls);

  stopPlayer();
  powerupTime = 0;

  engine.start();
  updateHud();
}

function restartGame() {
  if (!engine) return;

  hideMessage();
  hide(titleScreen);
  show(hud);
  show(mobileControls);

  stopPlayer();
  powerupTime = 0;

  engine.restart();
  updateHud();
}

function togglePause() {
  if (!engine) return;

  if (engine.state === "playing") {
    stopPlayer();
    engine.pause();
    showMessage("PAUSED", "Resume when you're ready.");
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
  if (!engine || engine.state !== "playing" || !player) return;

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
      if (player.trick()) {
        engine.addTrick(50);
      }
      break;

    case "powerup":
      if (engine.tokens >= 5 && powerupTime <= 0) {
        engine.tokens -= 5;
        powerupTime = 5;

        // Temporary collision protection.
        engine.invulnerable = Math.max(engine.invulnerable, 5);

        temporaryMessage(
          "POWER-UP ACTIVATED!",
          "Temporary protection activated!"
        );
      } else if (engine.tokens < 5) {
        temporaryMessage(
          "NOT ENOUGH RINGS",
          "Collect 5 rings to activate a power-up."
        );
      }
      break;
  }

  updateHud();
}

function bindButtons() {
  if (buttonsBound) return;
  buttonsBound = true;

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
      "Hold a movement control to skate. Release it to slow down. " +
      "Steer left and right, swipe up to jump, swipe down to crouch, " +
      "and collect rings for power-ups."
    );
  });
}

function updateCamera(delta) {
  if (!camera || !player) return;

  const heading = player.group.rotation.y;
  const distance = 8;

  const targetPosition = new THREE.Vector3(
    player.group.position.x - Math.sin(heading) * distance,
    player.group.position.y + 4.2,
    player.group.position.z - Math.cos(heading) * distance
  );

  camera.position.lerp(
    targetPosition,
    1 - Math.exp(-4 * delta)
  );

  const lookTarget = new THREE.Vector3(
    player.group.position.x + Math.sin(heading) * 3,
    player.group.position.y + 1.2,
    player.group.position.z + Math.cos(heading) * 3
  );

  camera.lookAt(lookTarget);
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

      setScore: score => setText("score-val", Math.floor(score)),
      setBest: () => setText("best-val", "∞"),
      setDistance: distance =>
        setText("distance-val", Math.floor(distance)),
      setTokens: tokens => setText("tokens-val", tokens),

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
        if (state === "playing") hideMessage();
        if (state !== "playing") stopPlayer();
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

      // Forward movement happens only while a direction button is held.
      onMove: horizontal => {
        steering = horizontal;

        if (engine?.state === "playing") {
          player?.move?.(
            horizontal,
            horizontal === 0 ? 0 : 1
          );
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

    renderer.setAnimationLoop(time => {
      if (disposed) return;

      const delta = previousTime
        ? Math.min((time - previousTime) / 1000, 0.05)
        : 0;

      previousTime = time;

      if (engine?.state === "playing") {
        engine.update(delta);

        if (powerupTime > 0) {
          powerupTime = Math.max(0, powerupTime - delta);
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

window.addEventListener("pagehide", () => {
  disposed = true;

  window.removeEventListener("resize", resize);

  if (powerupTimeout) clearTimeout(powerupTimeout);
  if (renderer) renderer.setAnimationLoop(null);

  controls?.dispose?.();
  engine?.dispose?.();
  player?.dispose?.();
  world?.dispose?.();
  renderer?.dispose?.();
}, { once: true });

boot();
