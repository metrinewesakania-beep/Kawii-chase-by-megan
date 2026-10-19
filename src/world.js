
 // src/world.js — KAWIIS CHASE WITH MEGAN
 // Animated city, pedestrians, streetlights, obstacles and collectibles.

export async function createWorld({ THREE, scene }) {
  const lanes = [-3.2, 0, 3.2];
  const actors = [];
  const stripes = [];
  const buildings = [];
  const pedestrians = [];
  const streetlights = [];
  let time = 0;
  let spawnTimer = 1;
  let disposed = false;

  const mat = (color, roughness = 0.75, metalness = 0) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const mats = {
    ground: mat(0x353641),
    road: mat(0x171923, 0.9),
    sidewalk: mat(0x777681),
    stripe: new THREE.MeshStandardMaterial({
      color: 0x50edff,
      emissive: 0x127a98,
      emissiveIntensity: 1.2
    }),
    building: [
      mat(0x464b61), mat(0x5b5268), mat(0x374c5c),
      mat(0x635b55), mat(0x393c50)
    ],
    window: new THREE.MeshBasicMaterial({ color: 0x8bf4ff }),
    pinkWindow: new THREE.MeshBasicMaterial({ color: 0xff78cf }),
    skin: [mat(0xb97955), mat(0x70452f), mat(0xd49a72), mat(0x8e5b42)],
    shirts: [mat(0x7e51e8), mat(0xe45b83), mat(0x45b8ad), mat(0xe3b454), mat(0xe8e8ef)],
    pants: [mat(0x242a3b), mat(0x394f6a), mat(0x303035)],
    hair: mat(0x211a21),
    shoe: mat(0xf3f0e8),
    barrier: mat(0xf15b65, 0.45),
    crate: mat(0x8a71e8),
    sign: mat(0x45dff4, 0.35, 0.2),
    ramp: mat(0xffb466),
    ring: new THREE.MeshStandardMaterial({
      color: 0xff8fdf,
      emissive: 0xff159f,
      emissiveIntensity: 2,
      metalness: 0.45,
      roughness: 0.2
    })
  };

  const geo = {
    cube: new THREE.BoxGeometry(1, 1, 1),
    stripe: new THREE.BoxGeometry(0.12, 0.035, 2.8),
    window: new THREE.BoxGeometry(0.55, 0.75, 0.08),
    ring: new THREE.TorusGeometry(0.55, 0.12, 10, 24),
    sphere: new THREE.SphereGeometry(0.19, 12, 10),
    limb: new THREE.CylinderGeometry(0.075, 0.095, 0.52, 8),
    wheel: new THREE.CylinderGeometry(0.1, 0.1, 0.1, 12)
  };

  const city = new THREE.Group();
  const roadGroup = new THREE.Group();
  const peopleGroup = new THREE.Group();
  const lightsGroup = new THREE.Group();
  scene.add(city, roadGroup, peopleGroup, lightsGroup);

  function addBox(parent, geometry, material, x, y, z, sx = 1, sy = 1, sz = 1) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  // Broad road, pavements and ground.
  addBox(city, geo.cube, mats.ground, 0, -0.5, -170, 100, 0.5, 460);
  addBox(city, geo.cube, mats.road, 0, -0.08, -170, 14, 0.18, 460);
  addBox(city, geo.cube, mats.sidewalk, -8.2, 0, -170, 2.4, 0.2, 460);
  addBox(city, geo.cube, mats.sidewalk, 8.2, 0, -170, 2.4, 0.2, 460);

  // Long road markings.
  for (let z = -395; z < 25; z += 4.5) {
    for (const x of [-1.6, 1.6]) {
      const s = addBox(roadGroup, geo.stripe, mats.stripe, x, 0.035, z);
      stripes.push(s);
    }
    for (const x of [-6.8, 6.8]) {
      const s = addBox(roadGroup, geo.stripe, mats.stripe, x, 0.04, z, 1, 1, 0.65);
      stripes.push(s);
    }
  }

  // Buildings with glowing windows and varied heights.
  for (let i = 0; i < 56; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const width = 4 + Math.random() * 5;
    const height = 8 + Math.random() * 25;
    const depth = 5 + Math.random() * 7;
    const group = new THREE.Group();
    group.position.set(side * (12 + Math.random() * 12), 0, -15 - Math.random() * 390);
    city.add(group);

    addBox(group, geo.cube, mats.building[i % mats.building.length],
      0, height / 2, 0, width, height, depth);

    const windowMat = i % 2 ? mats.window : mats.pinkWindow;
    for (let y = 2; y < height - 1; y += 2.6) {
      for (let x = -width * 0.3; x <= width * 0.3; x += 1.25) {
        addBox(group, geo.window, windowMat,
          x, y, side < 0 ? depth / 2 + 0.05 : -depth / 2 - 0.05);
      }
    }

    if (i % 3 === 0) {
      addBox(group, geo.cube, mats.sign, 0, height + 0.3, 0,
        width * 0.45, 0.3, depth * 0.45);
    }

    buildings.push({ group, side });
  }

  // Streetlights.
  for (let z = -380; z < 10; z += 22) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Group();
      lamp.position.set(side * 7.1, 0, z);
      lightsGroup.add(lamp);
      addBox(lamp, geo.cube, mats.sign, 0, 1.8, 0, 0.12, 3.6, 0.12);
      addBox(lamp, geo.cube, mats.window, -side * 0.45, 3.55, 0, 1, 0.12, 0.18);
      streetlights.push(lamp);
    }
  }

  // Pedestrians built from simple 3D character parts.
  // Their arms and legs animate while the street passes them.
  function makePedestrian(x, z, index) {
    const person = new THREE.Group();
    person.position.set(x, 0.1, z);
    person.rotation.y = x < 0 ? -0.12 : Math.PI + 0.12;
    peopleGroup.add(person);

    const skin = mats.skin[index % mats.skin.length];
    const shirt = mats.shirts[index % mats.shirts.length];
    const pants = mats.pants[index % mats.pants.length];

    addBox(person, geo.cube, shirt, 0, 1.05, 0, 0.42, 0.62, 0.25);
    addBox(person, geo.sphere, skin, 0, 1.57, 0, 1, 1, 1);
    addBox(person, geo.sphere, mats.hair, 0, 1.68, -0.025, 1.05, 0.55, 1.05);

    const arms = [];
    const legs = [];

    for (const side of [-1, 1]) {
      const arm = new THREE.Group();
      arm.position.set(side * 0.27, 1.29, 0);
      person.add(arm);
      addBox(arm, geo.limb, shirt, 0, -0.25, 0);
      addBox(arm, geo.sphere, skin, 0, -0.52, 0, 0.75, 0.75, 0.75);
      arms.push(arm);

      const leg = new THREE.Group();
      leg.position.set(side * 0.12, 0.77, 0);
      person.add(leg);
      addBox(leg, geo.limb, pants, 0, -0.25, 0);
      addBox(leg, geo.cube, mats.shoe, 0, -0.52, 0.08, 0.2, 0.12, 0.34);
      legs.push(leg);
    }

    pedestrians.push({
      group: person,
      arms,
      legs,
      phase: Math.random() * Math.PI * 2,
      pace: 2 + Math.random() * 1.5
    });
  }

  for (let i = 0; i < 34; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const x = side * (7.6 + Math.random() * 1.1);
    makePedestrian(x, -12 - i * 11.5, i);
  }

  function spawnObstacle(kind = "barrier", laneIndex = 1, z = -60) {
    if (disposed) return null;
    laneIndex = Math.max(0, Math.min(2, Math.floor(laneIndex)));

    const group = new THREE.Group();
    group.position.set(lanes[laneIndex], 0, z);

    if (kind === "barrier") {
      addBox(group, geo.cube, mats.barrier, 0, 0.6, 0, 2.2, 1.1, 0.8);
    } else if (kind === "crate") {
      addBox(group, geo.cube, mats.crate, 0, 0.7, 0, 1.4, 1.4, 1.4);
    } else if (kind === "sign") {
      addBox(group, geo.cube, mats.sign, 0, 1.55, 0, 1.9, 0.75, 0.16);
      addBox(group, geo.cube, mats.sign, 0, 0.8, 0, 0.1, 1.6, 0.1);
    } else if (kind === "ramp") {
      const ramp = addBox(group, geo.cube, mats.ramp, 0, 0.3, 0, 2.4, 0.5, 2.8);
      ramp.rotation.x = -0.12;
    } else {
      return null;
    }

    scene.add(group);
    const actor = { mesh: group, kind, lane: laneIndex, collected: false };
    actors.push(actor);
    return actor;
  }

  function spawnRing(laneIndex = 1, z = -48) {
    if (disposed) return null;
    laneIndex = Math.max(0, Math.min(2, Math.floor(laneIndex)));

    const ring = new THREE.Mesh(geo.ring, mats.ring);
    ring.rotation.x = Math.PI / 2;
    ring.position.set(lanes[laneIndex], 1.5, z);
    scene.add(ring);

    const actor = { mesh: ring, kind: "ring", lane: laneIndex, collected: false };
    actors.push(actor);
    return actor;
  }

  function removeActor(actor) {
    if (!actor) return;
    actor.mesh?.parent?.remove(actor.mesh);
    const index = actors.indexOf(actor);
    if (index >= 0) actors.splice(index, 1);
  }

  function clearAll() {
    for (const actor of actors) actor.mesh?.parent?.remove(actor.mesh);
    actors.length = 0;
  }

  function reset() {
    clearAll();
    time = 0;
    spawnTimer = 1;
    stripes.forEach((stripe, i) => {
      stripe.visible = true;
      stripe.position.z = -395 + Math.floor(i / 4) * 4.5;
    });
    pedestrians.forEach((p, i) => {
      p.group.position.z = -12 - i * 11.5;
      p.phase = Math.random() * Math.PI * 2;
    });
  }

  function update(delta, speed = 0) {
    if (disposed) return;
    const dt = Math.max(0, Math.min(delta || 0, 0.05));
    time += dt;

    // The world only streams past the skater while they are moving.
    const worldSpeed = Math.max(0, Number(speed) || 0) * 1.6;

    for (const stripe of stripes) {
      stripe.position.z += worldSpeed * dt;
      if (stripe.position.z > 15) stripe.position.z -= 420;
    }

    for (const building of buildings) {
      building.group.position.z += worldSpeed * dt;
      if (building.group.position.z > 28) {
        building.group.position.z -= 405;
        building.group.position.x = building.side * (12 + Math.random() * 12);
      }
    }

    for (const lamp of streetlights) {
      lamp.position.z += worldSpeed * dt;
      if (lamp.position.z > 20) lamp.position.z -= 400;
    }

    for (const p of pedestrians) {
      p.group.position.z += worldSpeed * dt;
      p.phase += dt * p.pace;
      p.legs[0].rotation.x = Math.sin(p.phase) * 0.55;
      p.legs[1].rotation.x = -Math.sin(p.phase) * 0.55;
      p.arms[0].rotation.x = -Math.sin(p.phase) * 0.35;
      p.arms[1].rotation.x = Math.sin(p.phase) * 0.35;

      if (p.group.position.z > 15) {
        p.group.position.z -= 400;
      }
    }

    spawnTimer -= dt;
    if (worldSpeed > 0.5 && spawnTimer <= 0) {
      spawnTimer = Math.max(0.7, 1.7 - time * 0.005);
      const lane = Math.floor(Math.random() * 3);
      const roll = Math.random();
      const kind = roll > 0.88 ? "crate" : roll > 0.72 ? "ramp" : roll > 0.5 ? "sign" : "barrier";
      spawnObstacle(kind, lane, -65 - Math.random() * 18);

      if (Math.random() > 0.3) {
        spawnRing(Math.floor(Math.random() * 3), -42 - Math.random() * 25);
      }
    }

    for (let i = actors.length - 1; i >= 0; i--) {
      const actor = actors[i];
      const mesh = actor.mesh;
      if (!mesh) {
        actors.splice(i, 1);
        continue;
      }

      mesh.position.z += worldSpeed * dt;
      if (actor.kind === "ring") {
        mesh.rotation.z += dt * 2.5;
        mesh.position.y = 1.5 + Math.sin(time * 4 + mesh.position.z) * 0.15;
      }

      if (mesh.position.z > 18) removeActor(actor);
    }
  }

  function dispose() {
    if (disposed) return;
    clearAll();
    scene.remove(city, roadGroup, peopleGroup, lightsGroup);

    // Release unique geometries and materials.
    Object.values(geo).forEach(g => g.dispose());
    for (const m of Object.values(mats)) {
      (Array.isArray(m) ? m : [m]).forEach(material => material.dispose());
    }
    disposed = true;
  }

  return {
    actors,
    lanes,
    spawnObstacle,
    spawnRing,
    remove: removeActor,
    clearAll,
    reset,
    update,
    dispose
  };
}
