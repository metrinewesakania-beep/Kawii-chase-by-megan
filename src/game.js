
 // src/game.js — KAWIIS CHASE WITH MEGAN
 // Improved movement-aware game engine.

export class GameEngine {
  constructor({ THREE, scene, camera, renderer, world, player, ui }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.world = world;
    this.player = player;
    this.ui = ui;

    this.state = "ready";
    this.score = 0;
    this.best = ui?.getBest?.() || 0;
    this.distance = 0;
    this.tokens = 0;
    this.chase = 0;
    this.elapsed = 0;
    this.speed = 0;
    this.invulnerable = 1.5;
    this._gameOverHandled = false;

    this.updateHUD();
  }

  updateHUD() {
    this.ui?.setScore?.(Math.floor(this.score));
    this.ui?.setBest?.(this.best);
    this.ui?.setDistance?.(Math.floor(this.distance));
    this.ui?.setTokens?.(this.tokens);
    this.ui?.setChase?.(this.chase);
  }

  setState(state) {
    this.state = state;
    this.ui?.onStateChange?.(state);
  }

  start() {
    this.score = 0;
    this.distance = 0;
    this.tokens = 0;
    this.chase = 0;
    this.elapsed = 0;
    this.speed = 0;
    this.invulnerable = 1.5;
    this._gameOverHandled = false;

    this.world?.reset?.();
    this.player?.reset?.();

    this.setState("playing");
    this.updateHUD();
  }

  restart() {
    this.start();
  }

  pause() {
    if (this.state !== "playing") return;
    this.setState("paused");
  }

  resume() {
    if (this.state !== "paused" && this.state !== "ready") return;
    this.setState("playing");
  }

  addTrick(points = 50) {
    if (this.state !== "playing") return;

    this.score += Math.max(0, Number(points) || 0);
    this.best = Math.max(this.best, Math.floor(this.score));
    this.chase = Math.max(0, this.chase - 3);

    this.ui?.saveBest?.(this.best);
    this.updateHUD();
  }

  collectRing(actor) {
    if (!actor || actor.collected) return;

    actor.collected = true;
    this.tokens += 1;
    this.score += 25;
    this.chase = Math.max(0, this.chase - 2);
    this.best = Math.max(this.best, Math.floor(this.score));

    this.world?.remove?.(actor);
    this.ui?.saveBest?.(this.best);
    this.updateHUD();
  }

  endRun(reason = "Run ended") {
    if (this._gameOverHandled) return;

    this._gameOverHandled = true;
    this.speed = 0;
    this.player?.move?.(0, 0);
    this.setState("gameover");

    this.ui?.showMessage?.("Run over", reason, {
      showResume: false
    });

    this.ui?.saveBest?.(this.best);
  }

  update(delta) {
    if (this.state !== "playing") return;

    const dt = Math.min(Math.max(Number(delta) || 0, 0), 0.05);

    this.elapsed += dt;

    if (this.invulnerable > 0) {
      this.invulnerable = Math.max(0, this.invulnerable - dt);
    }

    // Update player first so we can read actual movement speed.
    this.player?.update?.(dt);

    const actualSpeed = Math.max(0, Number(this.player?.speed) || 0);
    this.speed = actualSpeed;

    // World motion is tied to the skater's actual speed.
    this.world?.update?.(dt, actualSpeed);

    // Do not increase distance, score, or chase while stationary.
    if (actualSpeed > 0.15) {
      this.distance += actualSpeed * dt;
      this.score += actualSpeed * dt * 0.7;
      this.chase = Math.min(100, this.chase + dt * 1.8);
    }

    const playerGroup = this.player?.group;

    if (playerGroup && Array.isArray(this.world?.actors)) {
      const px = playerGroup.position.x;
      const pz = playerGroup.position.z;
      const jumpHeight = this.player.jumpHeight ?? 0;
      const sliding = Boolean(this.player.isSliding);

      for (let i = this.world.actors.length - 1; i >= 0; i--) {
        const actor = this.world.actors[i];
        if (!actor?.mesh) continue;

        const dx = Math.abs(actor.mesh.position.x - px);
        const dz = Math.abs(actor.mesh.position.z - pz);

        if (dx > 1.4 || dz > 1.5) continue;

        if (actor.kind === "ring") {
          this.collectRing(actor);
          continue;
        }

        const jumpedOver =
          ["barrier", "crate", "ramp"].includes(actor.kind) &&
          jumpHeight > 1.0;

        const slidUnder =
          actor.kind === "sign" && sliding;

        if (jumpedOver || slidUnder) {
          this.world.remove?.(actor);
          continue;
        }

        if (this.invulnerable <= 0) {
          this.player?.crash?.();
          this.endRun("You crashed! Try another run.");
          break;
        }
      }
    }

    this.best = Math.max(this.best, Math.floor(this.score));

    this.ui?.saveBest?.(this.best);
    this.updateHUD();

    if (this.chase >= 100) {
      this.endRun("The rivals caught up!");
    }
  }

  dispose() {
    try {
      this.world?.dispose?.();
    } catch (error) {
      console.warn("World cleanup:", error);
    }

    try {
      this.player?.dispose?.();
    } catch (error) {
      console.warn("Player cleanup:", error);
    }
  }
}
