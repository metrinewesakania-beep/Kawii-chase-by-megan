
 // src/world.js — KAWIIS CHASE WITH MEGAN
 // Enhanced animated city, road, skyline, obstacles, rings, and reset.
 // Preserves the existing createWorld API.

export async function createWorld({ THREE, scene }) {
  const lanes = [-3.2, 0, 3.2];
  const actors = [];
  const roadStripes = [];
  const skylineBuildings = [];
  const neonDetails = [];

  let time = 0;
  let spawnCooldown = 0;
  let zoneIndex = 0;
  let disposed = false;

  const clamp = (value, min, max) =>
    Math.max(min, Math.min(max, value));

  const mats = {
    ground: new THREE.MeshStandardMaterial({
      color: 0x17182b,
      roughness: 0.95
    }),
    road: new THREE.MeshStandardMaterial({
      color: 0x080c18,
      roughness: 0.85,
      metalness: 0.15
    }),
    stripe: new THREE.MeshStandardMaterial({
      color: 0x79f7ff,
      emissive: 0x165a77,
      emissiveIntensity: 1.4
    }),
    building: new THREE.MeshStandardMaterial({
      color: 0x171a35,
      roughness: 0.8,
      metalness: 0.2
    }),
    windowCyan: new THREE.MeshBasicMaterial({
      color: 0x55f6ff
    }),
    windowPink: new THREE.MeshBasicMaterial({
      color: 0xff51d8
    }),
    windowGold: new THREE.MeshBasicMaterial({
      color: 0xffc66d
    }),
    neonPink: new THREE.MeshBasicMaterial({
      color: 0xff4fd8
    }),
    neonCyan: new THREE.MeshBasicMaterial({
      color: 0x53f5ff
    }),
    ring: new THREE.MeshStandardMaterial({
      color: 0xff9cde,
      emissive: 0xff168f,
      emissiveIntensity: 1.8,
      metalness: 0.55,
      roughness: 0.2
    }),
    obstacle: new THREE.MeshStandardMaterial({
      color: 0xff716d,
      emissive: 0x401018,
      roughness: 0.45,
      metalness: 0.25
    }),
    sign: new THREE.MeshStandardMaterial({
      color: 0x4de4ff,
      emissive: 0x126080,
      metalness: 0.4
    }),
    crate: new THREE.MeshStandardMaterial({
      color: 0x7968ff,
      emissive: 0x201060,
      roughness: 0.55
    }),
    ramp: new THREE.MeshStandardMaterial({
      color: 0xffb36a,
      emissive: 0x603010,
      metalness: 0.25
    }),
    sunset: new THREE.MeshBasicMaterial({
      color: 0xffa45b,
      transparent: true,
      opacity: 0.15,
      depthWrite: false
    })
  };

  const geoms = {
    ground: new THREE.BoxGeometry(60, 0.5, 420),
    road: new THREE.BoxGeometry(14, 0.2, 420),
    stripe: new THREE.BoxGeometry(0.13, 0.055, 2.5),
    building: new THREE.BoxGeometry(1, 1, 1),
    window: new THREE.BoxGeometry(0.14, 0.55, 0.07),
    roof: new THREE.BoxGeometry(1, 0.15, 1),
    barrier: new THREE.BoxGeometry(2.2, 1.1, 1.1),
    crate: new THREE.BoxGeometry(1.4, 1.4, 1.4),
    signPole: new THREE.CylinderGeometry(0.08, 0.1, 3.4, 8),
    signBox: new THREE.BoxGeometry(2, 0.8, 0.14),
    ramp: new THREE.BoxGeometry(2.6, 0.6, 3),
    ring: new THREE.TorusGeometry(0.56, 0.12, 12, 28),
    pillar: new THREE.CylinderGeometry(0.12, 0.18, 2.5, 8)
  };

  const staticGroup = new THREE.Group();
  const skyline = new THREE.Group();
  const detailGroup = new THREE.Group();

  scene.add(staticGroup, skyline, detailGroup);

  // Road and surrounding ground.
  const ground = new THREE.Mesh(geoms.ground, mats.ground);
  ground.position.set(0, -0.35, -100);
  staticGroup.add(ground);

  const road = new THREE.Mesh(geoms.road, mats.road);
  road.position.set(0, 0.12, -100);
  staticGroup.add(road);

  // Animated lane markings and road-edge lights.
  for (let z = -400; z < 20; z += 4.4) {
    for (const x of [-1.6, 1.6]) {
      const stripe = new THREE.Mesh(geoms.stripe, mats.stripe);
      stripe.position.set(x, 0.25, z);
      staticGroup.add(stripe);
      roadStripes.push(stripe);
    }

    for (const x of [-6.7, 6.7]) {
      const edge = new THREE.Mesh(
        geoms.stripe,
        x < 0 ? mats.neonCyan : mats.neonPink
      );

      edge.scale.set(1, 1, 0.6);
      edge.position.set(x, 0.24, z);
      staticGroup.add(edge);
      roadStripes.push(edge);
    }
  }

  // City skyline with illuminated windows and varied building shapes.
  function createBuilding(z, side, index) {
    const height = 7 + Math.random() * 27;
    const width = 3 + Math.random() * 5;
    const depth = 3 + Math.random() * 5;

    const group = new THREE.Group();
    group.position.set(
      side * (10 + Math.random() * 15),
      0,
      z
    );

    const body = new THREE.Mesh(geoms.building, mats.building);
    body.scale.set(width, height, depth);
    body.position.y = height / 2 - 0.4;
    group.add(body);

    // Rooftop structure.
    if (index % 3 === 0) {
      const roof = new THREE.Mesh(geoms.roof, mats.crate);
      roof.scale.set(width * 0.65, 1, depth * 0.65);
      roof.position.set(0, height + 0.15, 0);
      group.add(roof);
    }

    // Windows on the side facing the road.
    const windowMat =
      index % 3 === 0 ? mats.windowGold :
      index % 3 === 1 ? mats.windowCyan :
      mats.windowPink;

    const rows = Math.min(12, Math.floor(height / 2.2));

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < 3; col++) {
        const windowMesh = new THREE.Mesh(
          geoms.window,
          windowMat
        );

        windowMesh.position.set(
          (col - 1) * width * 0.26,
          1.5 + row * 2,
          side < 0 ? depth / 2 + 0.04 : -depth / 2 - 0.04
        );

        group.add(windowMesh);
      }
    }

    // Vertical neon strips.
    const glow = new THREE.Mesh(
      geoms.window,
      index % 2 === 0 ? mats.neonCyan : mats.neonPink
    );

    glow.scale.set(1.5, Math.max(3, height * 0.7), 1);
    glow.position.set(
      side < 0 ? width / 2 + 0.05 : -width / 2 - 0.05,
      height * 0.52,
      depth / 2 + 0.06
    );

    group.add(glow);
    skyline.add(group);

    skylineBuildings.push({
      group,
      side,
      index,
      height,
      width,
      depth
    });
  }

  for (let i = 0; i < 46; i++) {
    createBuilding(
      -25 - Math.random() * 370,
      i % 2 === 0 ? -1 : 1,
      i
    );
  }

  // Street lamps and roadside neon pillars.
  for (let z = -360; z < 0; z += 24) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Group();
      lamp.position.set(side * 7.5, 0, z);

      const pole = new THREE.Mesh(geoms.pillar, mats.sign);
      pole.position.y = 1.25;
      lamp.add(pole);

      const light = new THREE.Mesh(
        geoms.window,
        side < 0 ? mats.neonCyan : mats.neonPink
      );

      light.scale.set(3, 0.3, 2);
      light.position.set(0, 2.6, 0);
      lamp.add(light);

      detailGroup.add(lamp);
      neonDetails.push(lamp);
    }
  }

  // Distant sunset.
  const sunGeometry = new THREE.SphereGeometry(18, 24, 18);
  const sun = new THREE.Mesh(sunGeometry, mats.sunset);
  sun.position.set(0, 14, -175);
  scene.add(sun);

  // Different city moods cycle during gameplay.
  const zones = [
    {
      name: "Neon District",
      background: 0x090d20,
      road: 0x080c18,
      ground: 0x17182b,
      stripe: 0x79f7ff,
      emissive: 0x165a77,
      fog: 0x11162d
    },
    {
      name: "Sunset Boulevard",
      background: 0x241126,
      road: 0x130e20,
      ground: 0x292036,
      stripe: 0xffb36a,
      emissive: 0x693018,
      fog: 0x321b35
    },
    {
      name: "Cyber Night",
      background: 0x050719,
      road: 0x070b19,
      ground: 0x11162a,
      stripe: 0xff51d8,
      emissive: 0x64104e,
      fog: 0x0c1028
    },
    {
      name: "Crystal City",
      background: 0x102032,
      road: 0x081522,
      ground: 0x172b3b,
      stripe: 0x9dfdff,
      emissive: 0x226b83,
      fog: 0x173044
    }
  ];

  function setZone(index) {
    zoneIndex = index % zones.length;
    const zone = zones[zoneIndex];

    scene.background = new THREE.Color(zone.background);
    mats.road.color.setHex(zone.road);
    mats.ground.color.setHex(zone.ground);
    mats.stripe.color.setHex(zone.stripe);
    mats.stripe.emissive.setHex(zone.emissive);

    if (scene.fog) {
      scene.fog.color.setHex(zone.fog);
    }

    return zone.name;
  }

  // Keep the original obstacle API.
  function spawnObstacle(kind = "barrier", laneIndex = 1, z = -60) {
    if (disposed) return null;

    laneIndex = clamp(Math.floor(laneIndex), 0, 2);

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

    laneIndex = clamp(Math.floor(laneIndex), 0, 2);

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

    // Restore the first city zone on restart.
    setZone(0);

    for (const stripe of roadStripes) {
      stripe.visible = true;
    }
  }

  function update(delta, speed = 18) {
    if (disposed) return;

    delta = clamp(delta, 0, 0.05);
    time += delta;
    spawnCooldown -= delta;

    // Cycle the city atmosphere every 35 seconds.
    const nextZone = Math.floor(time / 35) % zones.length;

    if (nextZone !== zoneIndex) {
      setZone(nextZone);
    }

    // Move road markings toward the player to simulate forward travel.
    const worldSpeed = Math.max(0, speed) * 1.6;

    for (const stripe of roadStripes) {
      stripe.position.z += worldSpeed * delta;

      if (stripe.position.z > 12) {
        stripe.position.z -= 420;
      }
    }

    // Move and recycle city buildings to create an endless city.
    for (const building of skylineBuildings) {
      building.group.position.z += worldSpeed * delta;

      if (building.group.position.z > 25) {
        building.group.position.z -= 395;
        building.group.position.x =
          building.side * (10 + Math.random() * 15);
      }
    }

    // Subtle motion on street lights.
    for (const lamp of neonDetails) {
      lamp.position.z += worldSpeed * delta;

      if (lamp.position.z > 18) {
        lamp.position.z -= 384;
      }
    }

    // Spawn obstacles and collectibles.
    if (spawnCooldown <= 0) {
      spawnCooldown = Math.max(0.55, 1.6 - time * 0.008);

      const lane = Math.floor(Math.random() * 3);
      const roll = Math.random();

      let kind = "barrier";

      if (roll > 0.72) kind = "sign";
      if (roll > 0.88) kind = "ramp";
      if (roll > 0.96) kind = "crate";

      spawnObstacle(kind, lane, -60 - Math.random() * 20);

      if (Math.random() > 0.36) {
        spawnRing(
          Math.floor(Math.random() * 3),
          -48 - Math.random() * 18
        );
      }
    }

    // Move actors and animate collectibles.
    for (let i = actors.length - 1; i >= 0; i--) {
      const actor = actors[i];
      const mesh = actor.mesh;

      if (!mesh) {
        actors.splice(i, 1);
        continue;
      }

      const velocity =
        actor.speed !== undefined ? actor.speed : speed;

      mesh.position.z += Math.max(0, velocity) * delta * 1.6;

      if (actor.kind === "ring") {
        mesh.rotation.z += delta * 3.2;
        mesh.rotation.y += delta * 2.1;
        mesh.position.y =
          1.55 + Math.sin(time * 4 + mesh.position.z) * 0.18;
      }

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
    scene.remove(detailGroup);
    scene.remove(sun);

    sunGeometry.dispose();

    // Dispose each shared geometry and material once.
    Object.values(geoms).forEach((geometry) => geometry.dispose());
    Object.values(mats).forEach((material) => material.dispose());

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
