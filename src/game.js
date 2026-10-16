// src/game.js
export class GameEngine {
  constructor({ THREE, scene, camera, renderer, world, player, ui }) {
    this.THREE = THREE;
    this.scene = scene;
    this.camera = camera;
    this.renderer = renderer;
    this.world = world;
    this.player = player;
    this.ui = ui;

    this.state = 'ready';
    this.score = 0;
    this.best = ui?.getBest?.() || 0;
    this.distance = 0;
    this.tokens = 0;
    this.chase = 0;
    this.elapsed = 0;
    this.speed = 14;
    this.invulnerable = 1.2;

    this._gameOverHandled = false;

    try { if (player) player.onTrickCallback = (pts) => this.addTrick(pts); } catch (e) {}

    this.updateHUD();
  }

  updateHUD() {
    this.ui?.setScore?.(this.score);
    this.ui?.setBest?.(this.best);
    this.ui?.setDistance?.(this.distance);
    this.ui?.setTokens?.(this.tokens);
    this.ui?.setChase?.(this.chase);
  }

  setState(s) {
    this.state = s;
    this.ui?.onStateChange?.(s);
  }

  start() {
    this.score = 0; this.distance = 0; this.tokens = 0; this.chase = 0; this.elapsed = 0; this.speed = 14; this.invulnerable = 1.2; this._gameOverHandled = false;
    this.world?.clearAll?.();
    try { this.player?.setLane?.(1); } catch (e) {}
    this.setState('playing');
    this.updateHUD();
  }

  restart() { this.start(); }

  pause() { if (this.state !== 'playing') return; this.setState('paused'); }

  resume() { if (this.state !== 'paused' && this.state !== 'ready') return; this.setState('playing'); }

  addTrick(points = 0) {
    this.score += Number(points) || 0;
    this.chase = Math.min(100, this.chase + 12);
    this.best = Math.max(this.best, this.score);
    this.updateHUD();
    this.ui?.saveBest?.(this.best);
  }

  collectRing(actor) {
    if (!actor || actor.collected) return;
    actor.collected = true;
    this.tokens += 1;
    this.score += 25;
    this.chase = Math.min(100, this.chase + 14);
    this.best = Math.max(this.best, this.score);
    this.ui?.saveBest?.(this.best);
    this.world?.remove?.(actor);
    this.updateHUD();
  }

  endRun(reason) {
    if (this._gameOverHandled) return;
    this._gameOverHandled = true;
    this.setState('gameover');
    this.ui?.showMessage?.('Game over', reason || 'Run ended', { showResume: false });
    this.ui?.saveBest?.(this.best);
  }

  update(delta) {
    if (this.state !== 'playing') return;

    this.elapsed += delta;
    if (this.invulnerable > 0) this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.speed = Math.min(58, 14 + this.elapsed * 1.15);

    this.world?.update?.(delta, this.speed);
    this.player?.update?.(delta);

    const px = this.player.group.position.x;
    const pz = this.player.group.position.z;
    const pj = this.player.jumpHeight ?? 0;
    const sliding = !!this.player.isSliding;

    for (let i = this.world.actors.length - 1; i >= 0; i--) {
      const a = this.world.actors[i];
      if (!a || !a.mesh) continue;
      const ax = a.mesh.position.x || 0;
      const az = a.mesh.position.z || 0;
      const dx = Math.abs(ax - px);
      const dz = Math.abs(az - pz);

      if (dx < 1.6 && dz < 1.6) {
        if (a.kind === 'ring') { if (!a.collected) this.collectRing(a); continue; }

        const safeByJump = (a.kind === 'barrier' || a.kind === 'crate' || a.kind === 'ramp') && (pj > 1.0);
        const safeBySlide = (a.kind === 'sign') && sliding;
        const safeByRamp = (a.kind === 'ramp') && (pj > 0.8);

        if (safeByJump || safeBySlide || safeByRamp) { this.world.remove?.(a); continue; }

        if (this.invulnerable <= 0) { this.endRun('You crashed'); break; }
      }
    }

    this.score += delta * 10;
    this.distance += delta * this.speed;
    this.chase = Math.min(100, this.chase + delta * 3.5);

    if (this.best < this.score) { this.best = Math.floor(this.score); this.ui?.saveBest?.(this.best); }

    this.updateHUD();

    if (this.chase >= 100) this.endRun('The chase caught you');
  }

  dispose() { try { this.world?.dispose?.(); } catch (e) {} try { this.player?.dispose?.(); } catch (e) {} }
}
