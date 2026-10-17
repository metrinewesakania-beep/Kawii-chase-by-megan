
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

let renderer;
let engine;
let world;
let player;
let controls;
let animationStarted = false;
let disposed = false;

function showError(message) {
  console.error(message);

  if (loading) loading.hidden = true;
  if (errorPanel) {
    errorPanel.hidden = false;
    errorPanel.textContent =
      "Unable to load the game. Please refresh the page. " +
      String(message);
  }
}

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

function setupRenderer() {
  if (!canvas) {
    throw new Error('Missing canvas element: "glcanvas".');
  }

  renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  renderer.setClearColor(0x100b26, 1);

  if ("outputColorSpace" in renderer) {
    renderer.outputColorSpace = THREE.SRGBColorSpace;
  }
}

function setupScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x100b26);
  scene.fog = new THREE.Fog(0x100b26, 45, 190);

  const camera = new THREE.PerspectiveCamera(
    65,
    window.innerWidth / window.innerHeight,
    0.1,
    500
  );

  camera.position.set(0, 5.2, 10);
  camera.lookAt(0, 1, -12);

  scene.add(new THREE.HemisphereLight(0x9cecff, 0x27133f, 2));

  const sunLight = new THREE.DirectionalLight(0xffc68c, 2.2);
  sunLight.position.set(-8, 15, 10);
  scene.add(sunLight);

  const cyanLight = new THREE.PointLight(0x36eaff, 18, 45);
  cyanLight.position.set(-5, 4, -15);
  scene.add(cyanLight);

  const pinkLight = new THREE.PointLight(0xff35cb, 18, 45);
  pinkLight.position.set(5, 4, -28);
  scene.add(pinkLight);

  return { scene, camera };
}

function updateHud() {
  if (!engine) return;

  const state = engine.state || engine;

  if (state.score !== undefined) {
    setText("score-val", Math.floor(state.score));
  }

  if (state.best !== undefined) {
    setText("best-val", Math.floor(state.best));
  }

  if (state.chaserProgress !== undefined) {
    const fill = $("chaser-fill");
    if (fill) {
      fill.style.width =
        `${Math.max(0, Math.min(100, state.chaserProgress))}%`;
    }
  }
}

function resize() {
  if (!renderer) return;

  const width = window.innerWidth;
  const height = Math.max(1, window.innerHeight);

  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));

  if (camera) {
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  }
}

let camera;

function showMessage(title, body) {
  setText("message-title", title);
  setText("message-body", body);
  show($("message"));
}

function hideMessage() {
  hide($("message"));
}

function startGame() {
  if (!engine) return;

  hide(titleScreen);
  hideMessage();
  hide(errorPanel);
  show(hud);
  show($("mobile-controls"));

  engine.start();
}

function togglePause() {
  if (!engine) return;

  const paused = engine.isPaused === true;

  if (paused) {
    engine.resume();
    hideMessage();
  } else {
    engine.pause();
    showMessage("PAUSED", "Take a breath. Resume when you're ready.");
  }
}

function bindButtons() {
  $("start-btn")?.addEventListener("click", startGame);

  $("restart-btn")?.addEventListener("click", () => {
    if (engine) engine.restart();
    hideMessage();
    show(hud);
    show($("mobile-controls"));
  });

  $("message-restart")?.addEventListener("click", () => {
    if (engine) engine.restart();
    hideMessage();
    show(hud);
    show($("mobile-controls"));
  });

  $("resume-btn")?.addEventListener("click", () => {
    if (engine) engine.resume();
    hideMessage();
  });

  $("pause-btn")?.addEventListener("click", togglePause);

  $("help-btn")?.addEventListener("click", () => {
    showMessage(
      "HOW TO PLAY",
      "Use the arrow buttons or swipe to change lanes. " +
      "Jump over obstacles, slide under signs, perform tricks, " +
      "and collect glowing rings."
    );
  });

  $("error")?.addEventListener("click", () => {
    window.location.reload();
  });
}

async function boot() {
  try {
    if (loading) show(loading);
    hide(errorPanel);

    setupRenderer();

    const setup = setupScene();
    const scene = setup.scene;
    camera = setup.camera;

    world = await createWorld({ THREE, scene });
    player = createPlayer({ THREE, scene });

    const ui = {
      setScore: (score) => setText("score-val", score),
      setBest: (best) => setText("best-val", best),
      showMessage,
      hideMessage,
      onGameOver: (score) => {
        showMessage("CHASE OVER", `Final score: ${score}`);
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
      onAction: (action) => {
        if (!engine) return;

        if (action === "left") player.setLane(-1);
        if (action === "right") player.setLane(1);
        if (action === "jump") player.jump();
        if (action === "slide") player.slide();
        if (action === "trick") {
          player.trick();
          if (engine.addTrick) engine.addTrick();
        }
      },
      onPause: togglePause,
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

    if (loading) hide(loading);
    show(titleScreen);
    hide(hud);
    hide($("mobile-controls"));

    let previousTime = 0;

    renderer.setAnimationLoop((time) => {
      if (disposed) return;

      const delta = previousTime
        ? Math.min((time - previousTime) / 1000, 0.05)
        : 0;

      previousTime = time;

      if (engine && animationStarted) {
        engine.update(delta);
        updateHud();
      }

      renderer.render(scene, camera);
    });

    animationStarted = true;
  } catch (error) {
    showError(error?.message || error);
  }
}

window.addEventListener("pagehide", () => {
  disposed = true;

  if (renderer) renderer.setAnimationLoop(null);
  if (controls && controls.dispose) controls.dispose();
  if (engine && engine.dispose) engine.dispose();
  if (player && player.dispose) player.dispose();
  if (world && world.dispose) world.dispose();
  if (renderer) renderer.dispose();
});

boot();
