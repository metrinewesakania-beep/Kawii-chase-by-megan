// KAWIIS CHASE WITH MEGAN
// Main game engine: scoring, movement, chasing, collisions and power-ups.

export class GameEngine {
  constructor({ player, world, ui = {} } = {}) {
    this.player = player;
    this.world = world;
    this.ui = ui;

    this.state = "ready";
    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.chase = 0;
    this.speed = 14;
    this.maxSpeed = 34;
    this.elapsed = 0;
    this.powerTime = 0;
    this.invulnerable = 0;
    this.jumpTime = 0;
    this.slideTime = 0;
    this.trickCooldown = 0;

    this.lastTime = 0;
    this.frameId = 0;
    this.boundLoop = (time) => this.loop(time);
  }

  start() {
    if (this.state === "playing") return;

    this.state = "playing";
    this.lastTime = 0;
    cancelAnimationFrame(this.frameId);
    this.frameId = requestAnimationFrame(this.boundLoop);
  }

  pause() {
    if (this.state !== "playing") return;
    this.state = "paused";
    cancelAnimationFrame(this.frameId);
  }

  resume() {
    if (this.state !== "paused") return;
    this.start();
  }

  restart() {
    cancelAnimationFrame(this.frameId);

    this.score = 0;
    this.distance = 0;
    this.coins = 0;
    this.chase = 0;
    this.speed = 14;
    this.elapsed = 0;
    this.powerTime = 0;
    this.invulnerable = 0;
    this.jumpTime = 0;
    this.slideTime = 0;
    this.trickCooldown = 0;
    this.lastTime = 0;

    this.player?.reset?.();
    this.world?.reset?.();

    this.state = "ready";
    this.updateUI();
  }

  action(name) {
    if (this.state !== "playing") return;

    switch (name) {
      case "left":
        this.player?.moveLane?.(-1);
        break;

      case "right":
        this.player?.moveLane?.(1);
        break;

      case "jump":
        if (!this.jumpTime && !this.slideTime) {
          this.jumpTime = 0.85;
          this.player?.jump?.();
        }
        break;

      case "slide":
        if (!this.slideTime && !this.jumpTime) {
          this.slideTime = 0.7;
          this.player?.slide?.();
        }
        break;

      case "trick":
        if (this.trickCooldown <= 0) {
          this.trickCooldown = 1;
          this.score += 50;
          this.player?.trick?.();
        }
        break;

      case "power":
        this.powerTime = 5;
        this.invulnerable = 5;
        this.player?.activatePower?.();
        break;
    }

    this.updateUI();
  }

  addTrick(points = 50) {
    if (this.state !== "playing") return;
    this.score += Math.max(0, points);
    this.updateUI();
  }

  collectRing(value = 1) {
    if (this.state !== "playing") return;
    this.coins += Math.max(1, value);
    this.score += 100;
    this.updateUI();
  }

  endRun(reason = "You were caught!") {
    if (this.state === "gameover") return;

    this.state = "gameover";
    cancelAnimationFrame(this.frameId);

    const best = Math.max(
      this.score,
      Number(this.readBest()) || 0
    );

    try {
      localStorage.setItem("kawii-chase-best", String(best));
    } catch (_) {}

    this.ui.onGameOver?.({
      score: this.score,
      distance: Math.floor(this.distance),
      coins: this.coins,
      best,
      reason
    });

    this.updateUI();
  }

  readBest() {
    try {
      return Number(localStorage.getItem("kawii-chase-best")) || 0;
    } catch (_) {
      return 0;
    }
  }

  updateUI() {
    this.ui.update?.({
      score: Math.floor(this.score),
      distance: Math.floor(this.distance),
      coins: this.coins,
      chase: this.chase,
      speed: this.speed,
      powerTime: this.powerTime,
      best: Math.max(this.score, this.readBest())
    });

    this.ui.saveBest?.(Math.max(this.score, this.readBest()));
  }

  loop(time) {
    if (this.state !== "playing") return;

    const dt = this.lastTime
      ? Math.min((time - this.lastTime) / 1000, 0.05)
      : 0;

    this.lastTime = time;
    this.elapsed += dt;

    this.powerTime = Math.max(0, this.powerTime - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.jumpTime = Math.max(0, this.jumpTime - dt);
    this.slideTime = Math.max(0, this.slideTime - dt);
    this.trickCooldown = Math.max(0, this.trickCooldown - dt);

    this.speed = Math.min(
      this.maxSpeed,
      14 + this.elapsed * 0.12
    );

    try {
      this.player?.update?.(dt, this.speed);
      this.world?.update?.(dt, this.speed);

      this.distance += this.speed * dt;
      this.score += this.speed * dt * 0.8;
      this.chase = Math.min(
        100,
        this.chase + dt * 0.7
      );

      // A world may expose collisions through this optional method.
      const collision = this.world?.checkCollision?.(this.player);

      if (collision && this.invulnerable <= 0) {
        this.endRun("You hit an obstacle!");
        return;
      }

      if (this.chase >= 100) {
        this.endRun("The rivals caught up!");
        return;
      }

      this.updateUI();
    } catch (error) {
      console.error("Game update failed:", error);
      this.pause();
      this.ui.onError?.(error);
      return;
    }

    this.frameId = requestAnimationFrame(this.boundLoop);
  }

  dispose() {
    cancelAnimationFrame(this.frameId);
    this.state = "disposed";
    this.player?.dispose?.();
    this.world?.dispose?.();
  }
}