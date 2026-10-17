
 // src/world.js — game world, lanes, obstacles, rings, and reset
export async function createWorld({ THREE, scene }) {
  const lanes = [-3.2, 0, 3.2];
  const actors = [];

  const mats = {
    ground: new THREE.MeshStandardMaterial({
      color: 0x151526,
      roughness: 1
    }),
    road: new THREE.MeshStandardMaterial({
      color: 0x090d1b,
      roughness: 0.95
    }),
    stripe: new THREE.MeshStandardMaterial({
      color: 0xffe59a,
      emissive: 0x665020
    }),
    building: new THREE.MeshStandardMaterial({
      color: 0x17132e,
      roughness: 0.9
    }),
    neonPink: new THREE.MeshBasicMaterial({ color: 0xff4fd8 }),
    neonCyan: new THREE.MeshBasicMaterial({ color: 0x53f5ff }),
    ring: new THREE.MeshStandardMaterial({
      color: 0xff7fcf,
      emissive: 0xff168f,
      emissiveIntensity: 1.2,
      metalness: 0.5,
      roughness: 0.2
    }),
    obstacle: new THREE.MeshStandardMaterial({
      color: 0xff716d,
      emissive: 0x401018
    }),
    sign: new THREE.MeshStandardMaterial({
      color: 0x4de4ff,
      emissive: 0x126080
    }),
    crate: new THREE.MeshStandardMaterial({
      color: 0x7968ff,
      emissive: 0x201060
    }),
    ramp: new THREE.MeshStandardMaterial({
      color: 0xffb36a,
      emissive: 0x603010
    }),
    sunset: new THREE.MeshBasicMaterial({
      color: 0xffa45b,
      transparent: true,
      opacity: 0.18,
      depthWrite: false
    })
  };

  const geoms = {
    ground: new THREE.BoxGeometry(40, 0.5, 400),
    road: new THREE.BoxGeometry(14, 0.2, 400),
    stripe: new THREE.BoxGeometry(0.12, 0.04, 2.2),
    building: new THREE.BoxGeometry(1, 1, 1),
    glow: new THREE.BoxGeometry(0.3, 1, 0.2),
    ring: new THREE.TorusGeometry(0.56, 0.12, 10, 24),
    barrier: new THREE.BoxGeometry(2.2, 1.1, 1.1),
    crate: new THREE.BoxGeometry(1.4, 1.4, 1.4),
    signPole: new THREE.CylinderGeometry(0.08, 0.08, 3.4, 8),
    signBox: new THREE.BoxGeometry(2, 0.8, 0.14),
    ramp: new THREE.BoxGeometry(2.6, 0.6, 3)
  };

  const staticGroup = new THREE.Group();
  const skyline = new THREE.Group();

  scene.add(staticGroup);
  scene.add(skyline);

  // Ground and road
  const ground = new THREE.Mesh(geoms.ground, mats.ground);
  ground.position.set(0, -0.35, -100);
  staticGroup.add(ground);

  const road = new THREE.Mesh(geoms.road, mats.road);
  road.position.set(0, 0.12, -100);
  staticGroup.add(road);

  // Neon lane markings
  for (let z = 0; z > -360; z -= 4.4) {
    const stripe = new THREE.Mesh(geoms.stripe, mats.stripe);
    stripe.position.set(-1.6, 0.24, z);
    staticGroup.add(stripe);

    const stripe2 = new THREE.Mesh(geoms.stripe, mats.stripe);
    stripe2.position.set(1.6, 0.24, z);
    staticGroup.add(stripe2);
  }

  // Distant futuristic skyline
  for (let i = 0; i < 36; i++) {
    const h = 5 + Math.random() * 24;
    const w = 2 + Math.random() * 4;

    const building = new THREE.Mesh(geoms.building, mats.building);
    building.scale.set(w, h, w * 0.8);

    const side = Math.random() < 0.5 ? -1 : 1;
    building.position.set(
      side * (12 + Math.random() * 20),
      h / 2 - 0.5,
      -20 - Math.random() * 300
    );

    skyline.add(building);

    const glow = new THREE.Mesh(
      geoms.glow,
      Math.random() > 0.5 ? mats.neonCyan : mats.neonPink
    );

    glow.scale.y = Math.max(1, h * 0.12);
    glow.position.set(
      building.position.x,
      h * 0.45,
      building.position.z + w * 0.42
    );

    skyline.add(glow);
  }

  // Sunset glow on the horizon
  const sun = new THREE.Mesh(
    new THREE.SphereGeometry(18, 16, 16),
    mats.sunset
  );
  sun.position.set(0, 14, -150);
  scene.add(sun);

  let time = 0;
  let spawnCooldown = 0;
  let disposed = false;

  function spawnObstacle(kind = "barrier", laneIndex = 1, z = -60) {
    if (disposed) return null;

    laneIndex = Math.max(0, Math.min(2, Math.floor(laneIndex)));

    const group = new THREE.Group();
    group.position.set(lanes[laneIndex], 0, z);
    group.userData = { kind, lane: laneIndex };

    if (kind === "barrier") {
      const mesh = new THREE.Mesh(geoms.barrier, mats.obstacle);
      mesh.position.y = 0.6;
      group.add(mesh);
    } else if (kind === "crate") {
      const mesh = new THREE.Mesh(geoms.crate, mats.crate);
      mesh.position.y = 0.75;
      group.add(mesh);
    } else if (kind === "sign") {
      const pole = new THREE.Mesh(geoms.signPole, mats.sign);
      pole.position.y = 1.7;
      group.add(pole);

      const board = new THREE.Mesh(geoms.signBox, mats.sign);
      board.position.y = 3.1;
      group.add(board);
    } else if (kind === "ramp") {
      const mesh = new THREE.Mesh(geoms.ramp, mats.ramp);
      mesh.rotation.z = -0.28;
      mesh.position.y = 0.38;
      group.add(mesh);
    } else {
      return null;
    }

    scene.add(group);

    const actor = {
      mesh: group,
      kind,
      lane: laneIndex,
      collected: false
    };

    actors.push(actor);
    return actor;
  }

  function spawnRing(laneIndex = 1, z = -48) {
    if (disposed) return null;

    laneIndex = Math.max(0, Math.min(2, Math.floor(laneIndex)));

    const ring = new THREE.Mesh(geoms.ring, mats.ring);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(
      lanes[laneIndex],
      1.4 + Math.random() * 0.6,
      z
    );

    scene.add(ring);

    const actor = {
      mesh: ring,
      kind: "ring",
      lane: laneIndex,
      collected: false
    };

    actors.push(actor);
    return actor;
  }

  function removeActor(actor) {
    if (!actor) return;

    if (actor.mesh?.parent) {
      actor.mesh.parent.remove(actor.mesh);
    }

    const index = actors.indexOf(actor);
    if (index !== -1) actors.splice(index, 1);
  }

  function clearAll() {
    for (let i = actors.length - 1; i >= 0; i--) {
      const actor = actors[i];

      if (actor.mesh?.parent) {
        actor.mesh.parent.remove(actor.mesh);
      }
    }

    actors.length = 0;
  }

  function reset() {
    clearAll();
    time = 0;
    spawnCooldown = 0;
  }

  function update(delta, speed = 18) {
    if (disposed) return;

    // Protect the simulation from unusually large frame times.
    delta = Math.max(0, Math.min(delta, 0.05));

    time += delta;
    spawnCooldown -= delta;

    if (spawnCooldown <= 0) {
      spawnCooldown = Math.max(0.55, 1.6 - time * 0.008);

      const lane = Math.floor(Math.random() * 3);
      const roll = Math.random();

      let kind = "barrier";

      if (roll > 0.72) kind = "sign";
      if (roll > 0.88) kind = "ramp";
      if (roll > 0.96) kind = "crate";

      spawnObstacle(kind, lane, -60 - Math.random() * 20);

      // Collectibles can appear in a different lane.
      if (Math.random() > 0.36) {
        const ringLane = Math.floor(Math.random() * 3);
        spawnRing(ringLane, -48 - Math.random() * 18);
      }
    }

    for (let i = actors.length - 1; i >= 0; i--) {
      const actor = actors[i];
      const mesh = actor.mesh;

      if (!mesh) {
        actors.splice(i, 1);
        continue;
      }

      const velocity =
        actor.speed !== undefined ? actor.speed : speed;

      mesh.position.z += velocity * delta * 1.6;

      if (actor.kind === "ring") {
        mesh.rotation.z += delta * 3.2;
        mesh.rotation.y += delta * 2.1;
      }

      // Remove objects after they pass the player.
      if (mesh.position.z > 20) {
        if (mesh.parent) mesh.parent.remove(mesh);
        actors.splice(i, 1);
      }
    }
  }

  function dispose() {
    if (disposed) return;

    clearAll();

    scene.remove(staticGroup);
    scene.remove(skyline);
    scene.remove(sun);

    geoms.building.dispose();
    geoms.glow.dispose();

    // Shared scene objects
    geoms.ground.dispose();
    geoms.road.dispose();
    geoms.stripe.dispose();
    geoms.ring.dispose();
    geoms.barrier.dispose();
    geoms.crate.dispose();
    geoms.signPole.dispose();
    geoms.signBox.dispose();
    geoms.ramp.dispose();

    new THREE.SphereGeometry(1).dispose(); // No persistent geometry created here.

    Object.values(mats).forEach((material) => {
      material.dispose();
    });

    sun.geometry.dispose();
    sun.material.dispose();

    disposed = true;
  }

  return {
    actors,
    lanes,
    spawnObstacle,
    spawnRing,
    remove: removeActor,
    clearAll,
    update,
    reset,
    dispose
  };
}
