// src/world.js
// createWorld({ THREE, scene }) -> world object
export async function createWorld({ THREE, scene }) {
  const lanes = [-3.2, 0, 3.2];

  // Shared materials and geometries to reduce GC
  const mats = {
    road: new THREE.MeshStandardMaterial({ color: 0x0b1220, roughness: 1 }),
    stripe: new THREE.MeshStandardMaterial({ color: 0xffe59a, roughness: 0.8 }),
    building: new THREE.MeshStandardMaterial({ color: 0x141130, roughness: 0.95 }),
    neonPink: new THREE.MeshBasicMaterial({ color: 0xff4fd8 }),
    neonCyan: new THREE.MeshBasicMaterial({ color: 0x53f5ff }),
    ring: new THREE.MeshStandardMaterial({ color: 0xff7fcf, emissive: 0xff7fcf, metalness: 0.6, roughness: 0.2 }),
    obstacle: new THREE.MeshStandardMaterial({ color: 0xff7d6e, roughness: 0.7 }),
    sign: new THREE.MeshStandardMaterial({ color: 0x4de4ff, roughness: 0.6 }),
    crate: new THREE.MeshStandardMaterial({ color: 0x7b6dff, roughness: 0.7 }),
    ramp: new THREE.MeshStandardMaterial({ color: 0xffb36a, roughness: 0.7 })
  };

  const geoms = {
    stripe: new THREE.BoxGeometry(0.5, 0.04, 2.2),
    ring: new THREE.TorusGeometry(0.56, 0.12, 10, 20),
    barrier: new THREE.BoxGeometry(2.2, 1.1, 1.1),
    crate: new THREE.BoxGeometry(1.4, 1.4, 1.4),
    signPole: new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8),
    signBox: new THREE.BoxGeometry(2.0, 0.8, 0.14),
    ramp: new THREE.BoxGeometry(2.6, 0.6, 3.0)
  };

  const actors = [];

  // Static environment group
  const staticGroup = new THREE.Group();
  scene.add(staticGroup);

  // Road / ground
  const ground = new THREE.Mesh(new THREE.BoxGeometry(40, 0.5, 400), new THREE.MeshStandardMaterial({ color: 0x0f1220, roughness: 1 }));
  ground.position.set(0, -0.35, -100);
  staticGroup.add(ground);

  const road = new THREE.Mesh(new THREE.BoxGeometry(14, 0.2, 400), mats.road);
  road.position.set(0, 0.12, -100);
  staticGroup.add(road);

  // lane stripes (repeated along z)
  for (let i = -12; i < 160; i += 3.2) {
    const s = new THREE.Mesh(geoms.stripe, mats.stripe);
    s.position.set(0, 0.24, -i * 2.2);
    staticGroup.add(s);
  }

  // skyline decorative
  const skyline = new THREE.Group();
  for (let i = 0; i < 22; i++) {
    const h = 5 + Math.random() * 28;
    const w = 1.6 + Math.random() * 3.0;
    const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, w * 0.8), mats.building.clone());
    b.position.set(-28 + Math.random() * 56, h / 2 - 0.6, -40 - Math.random() * 260);
    skyline.add(b);
    const glow = new THREE.Mesh(new THREE.BoxGeometry(w * 0.2, h * 0.16, w * 0.2), Math.random() > 0.5 ? mats.neonCyan : mats.neonPink);
    glow.position.set(b.position.x, h * 0.45, b.position.z + 0.6);
    skyline.add(glow);
  }
  scene.add(skyline);

  // horizon glow
  const sun = new THREE.Mesh(new THREE.SphereGeometry(18, 12, 12), new THREE.MeshBasicMaterial({ color: 0xffb36a, transparent: true, opacity: 0.12 }));
  sun.position.set(0, 14, -120);
  scene.add(sun);

  // runtime variables
  let time = 0;
  let spawnCooldown = 0;

  function spawnObstacle(kind = 'barrier', laneIndex = 1, z = -60) {
    laneIndex = Math.max(0, Math.min(2, laneIndex));
    const x = lanes[laneIndex];
    const group = new THREE.Group();
    group.position.set(x, 0, z - Math.random() * 6);
    group.userData = { kind, lane: laneIndex };

    if (kind === 'barrier') {
      const m = new THREE.Mesh(geoms.barrier, mats.obstacle);
      m.position.y = 0.6;
      group.add(m);
    } else if (kind === 'crate') {
      const c = new THREE.Mesh(geoms.crate, mats.crate);
      c.position.y = 0.75;
      group.add(c);
    } else if (kind === 'sign') {
      const pole = new THREE.Mesh(geoms.signPole, mats.sign);
      pole.position.y = 1.9;
      group.add(pole);
      const box = new THREE.Mesh(geoms.signBox, mats.sign);
      box.position.y = 3.1;
      group.add(box);
    } else if (kind === 'ramp') {
      const r = new THREE.Mesh(geoms.ramp, mats.ramp);
      r.rotation.z = -0.28;
      r.position.y = 0.38;
      group.add(r);
    }

    scene.add(group);
    const actor = { mesh: group, kind, lane: laneIndex, spawnedAt: time, collected: false };
    actors.push(actor);
    return actor;
  }

  function spawnRing(laneIndex = 1, z = -48) {
    laneIndex = Math.max(0, Math.min(2, laneIndex));
    const tor = new THREE.Mesh(geoms.ring, mats.ring);
    tor.rotation.x = Math.PI / 2;
    tor.position.set(lanes[laneIndex], 1.4 + Math.random() * 0.6, z - Math.random() * 6);
    scene.add(tor);
    const actor = { mesh: tor, kind: 'ring', lane: laneIndex, collected: false };
    actors.push(actor);
    return actor;
  }

  function removeActor(actor) {
    if (!actor) return;
    if (actor.mesh && actor.mesh.parent) actor.mesh.parent.remove(actor.mesh);
    const i = actors.indexOf(actor);
    if (i >= 0) actors.splice(i, 1);
  }

  function clearAll() {
    for (let i = actors.length - 1; i >= 0; i--) {
      const a = actors[i];
      if (a.mesh && a.mesh.parent) a.mesh.parent.remove(a.mesh);
    }
    actors.length = 0;
  }

  // update: move actors towards player (increase z), spawn new ones
  function update(delta, speed = 18) {
    time += delta;
    spawnCooldown -= delta;

    // spawn logic, avoids blocking all lanes
    const spawnInterval = Math.max(0.5, 1.6 - time * 0.01);
    if (spawnCooldown <= 0) {
      spawnCooldown = spawnInterval;

      // choose pattern
      const lane = Math.floor(Math.random() * 3);
      const roll = Math.random();
      let kind = 'barrier';
      if (roll > 0.74) kind = 'sign';
      if (roll > 0.9) kind = 'ramp';
      if (roll > 0.96) kind = 'crate';

      spawnObstacle(kind, lane, -60 - Math.random() * 20);

      // sometimes spawn a ring nearby but not covering all lanes
      if (Math.random() > 0.36) {
        const rlane = Math.floor(Math.random() * 3);
        spawnRing(rlane, -48 - Math.random() * 18);
      }
    }

    // move actors forward relative to player
    for (let i = actors.length - 1; i >= 0; i--) {
      const a = actors[i];
      const vel = (a.speed !== undefined) ? a.speed : speed;
      a.mesh.position.z += vel * delta * 1.6;

      if (a.kind === 'ring') {
        a.mesh.rotation.z += delta * 3.2;
        a.mesh.rotation.y += delta * 2.1;
      }

      if (a.mesh.position.z > 20) {
        // remove
        if (a.mesh.parent) a.mesh.parent.remove(a.mesh);
        actors.splice(i, 1);
      }
    }
  }

  function dispose() {
    clearAll();
    // dispose geoms & mats
    Object.values(geoms).forEach(g => { try { g.dispose?.(); } catch (e) {} });
    Object.values(mats).forEach(m => { try { m.dispose?.(); } catch (e) {} });
  }

  return {
    actors,
    lanes,
    spawnObstacle,
    spawnRing,
    remove: removeActor,
    clearAll,
    update,
    disposefunction reset() {
  clearAll();
  time = 0;
  spawnCooldown = 0;
}
  };
}
