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

let renderer = null;
let camera = null;
let engine = null;
let world = null;
let player = null;
let controls = null;
let animationStarted = false;
let disposed = false;
let buttonsBound = false;

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
// The game can still run when storage is unavailable.
}
}

function showError(error) {
console.error("KAWIIS CHASE WITH MEGAN:", error);

hide(loading);

if (errorPanel) {
errorPanel.textContent =
"Unable to load the game. Check your internet connection, " +
"then refresh the page. Error: " +
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

if ("outputColorSpace" in renderer) {
renderer.outputColorSpace = THREE.SRGBColorSpace;
}
}

function setupScene() {
const scene = new THREE.Scene();

scene.background = new THREE.Color(0x100b26);
scene.fog = new THREE.Fog(0x100b26, 45, 190);

camera = new THREE.PerspectiveCamera(
65,
window.innerWidth / Math.max(1, window.innerHeight),
0.1,
500
);

camera.position.set(0, 5.2, 10);
camera.lookAt(0, 1, -12);

scene.add(
new THREE.HemisphereLight(0x9cecff, 0x27133f, 2)
);

const sunLight = new THREE.DirectionalLight(0xffc68c, 2.2);
sunLight.position.set(-8, 15, 10);
scene.add(sunLight);

const cyanLight = new THREE.PointLight(0x36eaff, 18, 45);
cyanLight.position.set(-5, 4, -15);
scene.add(cyanLight);

const pinkLight = new THREE.PointLight(0xff35cb, 18, 45);
pinkLight.position.set(5, 4, -28);
scene.add(pinkLight);

return scene;
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
setText("best-val", Math.floor(engine.best || 0));

const fill = $("chaser-fill");

if (fill) {
fill.style.width =
"${Math.max(0, Math.min(100, engine.chase || 0))}%";
}
}

function startGame() {
if (!engine) return;

hide(titleScreen);
hideMessage();
hide(errorPanel);
show(hud);
show(mobileControls);

engine.start();
updateHud();
}

function restartGame() {
if (!engine) return;

hideMessage();
hide(titleScreen);
show(hud);
show(mobileControls);

engine.restart();
updateHud();
}

function togglePause() {
if (!engine) return;

if (engine.state === "playing") {
engine.pause();
showMessage(
"PAUSED",
"Take a breath. Resume when you're ready."
);
} else if (engine.state === "paused") {
engine.resume();
hideMessage();
}
}

function bindButtons() {
if (buttonsBound) return;
buttonsBound = true;

$("start-btn")?.addEventListener("click", startGame);

$("restart-btn")?.addEventListener("click", restartGame);
$("message-restart")?.addEventListener("click", restartGame);

$("resume-btn")?.addEventListener("click", () => {
if (engine?.state === "paused") {
engine.resume();
}

hideMessage();

});

$("pause-btn")?.addEventListener("click", togglePause);

$("help-btn")?.addEventListener("click", () => {
showMessage(
"HOW TO PLAY",
"Move left or right to change lanes. Jump over barriers, " +
"slide under signs, perform tricks while airborne, and " +
"collect glowing rings. Avoid obstacles and keep moving!"
);
});

errorPanel?.addEventListener("click", () => {
window.location.reload();
});
}

function handleAction(action) {
if (!engine || engine.state !== "playing" || !player) return;

switch (action) {
case "left":
player.setLane(-1);
break;

case "right":
  player.setLane(1);
  break;

case "jump":
  player.jump();
  break;

case "slide":
  player.slide();
  break;

case "trick":
  // Tricks only score while the player is airborne.
  if (player.trick()) {
    engine.addTrick(50);
  }
  break;

}
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

const scene = setupScene();

world = await createWorld({ THREE, scene });

if (disposed) {
  world.dispose?.();
  renderer?.dispose();
  return;
}

player = createPlayer({ THREE, scene });

const ui = {
  getBest: readBest,
  saveBest,
  setScore: (score) => setText("score-val", Math.floor(score)),
  setBest: (best) => setText("best-val", Math.floor(best)),
  setChase: (chase) => {
    const fill = $("chaser-fill");
    if (fill) {
      fill.style.width =
        `${Math.max(0, Math.min(100, chase))}%`;
    }
  },
  showMessage,
  hideMessage,
  onGameOver: (score) => {
    showMessage(
      "CHASE OVER",
      `Final score: ${Math.floor(score)}`,
      { showResume: false }
    );
  },
  onStateChange: (state) => {
    if (state === "playing") {
      hideMessage();
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
showError(error);
}
}

window.addEventListener(
"pagehide",
() => {
disposed = true;
window.removeEventListener("resize", resize);

if (renderer) renderer.setAnimationLoop(null);
controls?.dispose?.();
engine?.dispose?.();
player?.dispose?.();
world?.dispose?.();
renderer?.dispose?.();

},
{ once: true }
);

boot();