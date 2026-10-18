
 // src/player.js — KAWIIS CHASE WITH MEGAN
 // Upgraded skater, detailed board, animated limbs and visual crash.
 // Compatible with the existing Three.js game API.

export function createPlayer({ THREE, scene }) {
  const group = new THREE.Group();
  group.name = "MeganSkater";
  scene.add(group);

  const makeMat = (color, roughness = 0.65, metalness = 0.05, emissive = 0) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      emissive,
      emissiveIntensity: emissive ? 1.2 : 0
    });

  const mat = {
    hoodie: makeMat(0x5728a8),
    hoodieLight: makeMat(0x9664ef),
    pants: makeMat(0x202638),
    skin: makeMat(0xb97c5c),
    shoes: makeMat(0xf2f4fa, 0.48),
    cyan: makeMat(0x32e9ff, 0.32, 0.35, 0x087caa),
    dark: makeMat(0x11131d),
    deck: makeMat(0x292039, 0.38, 0.22),
    grip: makeMat(0x171722, 0.95),
    rubber: makeMat(0x080a10, 0.85),
    metal: makeMat(0x9aa8b8, 0.28, 0.8),
    eye: makeMat(0x5df4ff, 0.25, 0.15, 0x19bddd),
    accent: makeMat(0xff4ecb, 0.35, 0.15, 0x901060)
  };

  function part(parent, geometry, material, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function box(parent, material, size, pos) {
    return part(
      parent,
      new THREE.BoxGeometry(size[0], size[1], size[2]),
      material,
      pos[0], pos[1], pos[2]
    );
  }

  function sphere(parent, material, radius, pos, segments = 16) {
    return part(
      parent,
      new THREE.SphereGeometry(radius, segments, 12),
      material,
      pos[0], pos[1], pos[2]
    );
  }

  // Rounded limb segment, aligned vertically.
  function segment(parent, material, radius, length, pos) {
    const pivot = new THREE.Group();
    pivot.position.set(pos[0], pos[1], pos[2]);
    parent.add(pivot);

    part(
      pivot,
      new THREE.CylinderGeometry(radius * 0.94, radius, length, 14),
      material,
      0, -length / 2, 0
    );

    sphere(pivot, material, radius, [0, 0, 0], 14);
    return pivot;
  }

  // --------------------------------------------------
  // SKATEBOARD
  // --------------------------------------------------

  const board = new THREE.Group();
  board.name = "Skateboard";
  group.add(board);

  box(board, mat.deck, [0.91, 0.09, 1.96], [0, 0.22, 0]);
  box(board, mat.grip, [0.79, 0.025, 1.68], [0, 0.278, 0]);

  // Bright deck rails.
  for (const x of [-0.405, 0.405]) {
    box(board, mat.cyan, [0.022, 0.026, 1.48], [x, 0.292, 0]);
  }

  // Small deck graphics.
  box(board, mat.accent, [0.24, 0.025, 0.4], [0, 0.296, 0.02]);
  box(board, mat.cyan, [0.06, 0.028, 0.65], [0, 0.298, 0.02]);

  // Trucks, axles, wheels and hubs.
  const wheels = [];

  for (const z of [-0.61, 0.61]) {
    box(board, mat.metal, [0.59, 0.055, 0.12], [0, 0.15, z]);

    for (const x of [-0.4, 0.4]) {
      const wheel = part(
        board,
        new THREE.CylinderGeometry(0.12, 0.12, 0.105, 20),
        mat.rubber,
        x, 0.105, z
      );

      wheel.rotation.z = Math.PI / 2;
      wheels.push(wheel);

      const hub = part(
        board,
        new THREE.CylinderGeometry(0.047, 0.047, 0.11, 16),
        mat.cyan,
        x, 0.105, z
      );

      hub.rotation.z = Math.PI / 2;
    }
  }

  // --------------------------------------------------
  // SKATER BODY
  // --------------------------------------------------

  const body = new THREE.Group();
  body.name = "SkaterBody";
  group.add(body);

  // Torso.
  const torso = part(
    body,
    new THREE.CapsuleGeometry(0.31, 0.48, 5, 16),
    mat.hoodie,
    0, 1.62, 0
  );

  torso.scale.set(1.08, 1.12, 0.78);

  // Jacket details and front zipper.
  box(body, mat.hoodieLight, [0.46, 0.11, 0.035], [0, 1.82, 0.244]);
  box(body, mat.dark, [0.035, 0.39, 0.025], [0, 1.57, 0.25]);
  box(body, mat.cyan, [0.12, 0.035, 0.025], [0, 1.39, 0.26]);

  // Hood behind the head.
  const hood = sphere(body, mat.hoodieLight, 0.285, [0, 2.16, -0.065], 20);
  hood.scale.set(1.06, 1.05, 0.9);

  // Head and hair/cap silhouette.
  sphere(body, mat.skin, 0.225, [0, 2.19, 0.04], 22);

  const hair = sphere(body, mat.dark, 0.237, [0, 2.32, -0.035], 20);
  hair.scale.set(1.03, 0.62, 0.94);

  // Visor and stylized glowing eye strip.
  box(body, mat.dark, [0.29, 0.06, 0.035], [0, 2.19, 0.25]);
  box(body, mat.eye, [0.085, 0.022, 0.018], [-0.071, 2.195, 0.273]);
  box(body, mat.eye, [0.085, 0.022, 0.018], [0.071, 2.195, 0.273]);

  // --------------------------------------------------
  // ARMS WITH ANIMATED PIVOTS
  // --------------------------------------------------

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.35, 1.86, 0);
  body.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.35, 1.86, 0);
  body.add(rightArm);

  segment(leftArm, mat.hoodieLight, 0.105, 0.34, [0, -0.04, 0]);
  segment(leftArm, mat.hoodie, 0.08, 0.3, [0, -0.36, 0.015]);
  sphere(leftArm, mat.skin, 0.082, [0, -0.56, 0.02], 14);

  segment(rightArm, mat.hoodieLight, 0.105, 0.34, [0, -0.04, 0]);
  segment(rightArm, mat.hoodie, 0.08, 0.3, [0, -0.36, 0.015]);
  sphere(rightArm, mat.skin, 0.082, [0, -0.56, 0.02], 14);

  // --------------------------------------------------
  // LEGS AND SHOES
  // --------------------------------------------------

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.17, 1.19, 0);
  body.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.17, 1.19, 0);
  body.add(rightLeg);

  segment(leftLeg, mat.pants, 0.115, 0.39, [0, -0.06, 0]);
  segment(leftLeg, mat.pants, 0.09, 0.31, [0, -0.4, 0.015]);

  segment(rightLeg, mat.pants, 0.115, 0.39, [0, -0.06, 0]);
  segment(rightLeg, mat.pants, 0.09, 0.31, [0, -0.4, 0.015]);

  // Sneakers.
  box(leftLeg, mat.shoes, [0.25, 0.14, 0.39], [0, -0.65, 0.09]);
  box(rightLeg, mat.shoes, [0.25, 0.14, 0.39], [0, -0.65, 0.09]);

  box(leftLeg, mat.cyan, [0.22, 0.03, 0.14], [0, -0.58, 0.19]);
  box(rightLeg, mat.cyan, [0.22, 0.03, 0.14], [0, -0.58, 0.19]);

  // --------------------------------------------------
  // GAME STATE
  // --------------------------------------------------

  const lanes = [-3.2, 0, 3.2];

  let lane = 1;
  let jumpVelocity = 0;
  let jumpHeight = 0;
  let slideTimer = 0;
  let trickTimer = 0;
  let trickCount = 0;
  let elapsed = 0;
  let crashTimer = 0;
  let crashed = false;
  let disposed = false;

  function setLane(direction) {
    if (crashed) return;

    lane = THREE.MathUtils.clamp(
      lane + Math.sign(direction),
      0,
      lanes.length - 1
    );
  }

  function jump() {
    if (crashed) return;

    if (jumpHeight <= 0.02 && slideTimer <= 0) {
      jumpVelocity = 8.5;
    }
  }

  function slide() {
    if (!crashed && jumpHeight <= 0.05) {
      slideTimer = 0.75;
    }
  }

  function trick() {
    if (!crashed && jumpHeight > 0.2) {
      trickTimer = 0.55;
      trickCount += 1;
      return true;
    }

    return false;
  }

  // Visual crash animation. This is not a physics simulation.
  function crash() {
    if (crashed) return;

    crashed = true;
    crashTimer = 0.9;
    jumpVelocity = 0;
    slideTimer = 0;
    trickTimer = 0;
  }

  function reset() {
    lane = 1;
    jumpVelocity = 0;
    jumpHeight = 0;
    slideTimer = 0;
    trickTimer = 0;
    crashTimer = 0;
    crashed = false;

    group.position.set(0, 0, 0);
    group.rotation.set(0, 0, 0);
    body.position.set(0, 0, 0);
    body.rotation.set(0, 0, 0);
    board.position.set(0, 0, 0);
    board.rotation.set(0, 0, 0);

    leftArm.rotation.set(0, 0, 0);
    rightArm.rotation.set(0, 0, 0);
    leftLeg.rotation.set(0, 0, 0);
    rightLeg.rotation.set(0, 0, 0);
  }

  // --------------------------------------------------
  // FRAME UPDATE
  // --------------------------------------------------

  function update(delta) {
    const dt = Math.min(Math.max(delta || 0, 0), 0.04);

    elapsed += dt;

    // Smooth lane changes.
    if (!crashed) {
      group.position.x = THREE.MathUtils.damp(
        group.position.x,
        lanes[lane],
        12,
        dt
      );
    }

    // Jump physics.
    if (!crashed && (jumpVelocity !== 0 || jumpHeight > 0)) {
      jumpHeight += jumpVelocity * dt;
      jumpVelocity -= 19 * dt;

      if (jumpHeight <= 0) {
        jumpHeight = 0;
        jumpVelocity = 0;
      }
    }

    slideTimer = Math.max(0, slideTimer - dt);
    trickTimer = Math.max(0, trickTimer - dt);

    board.position.y = jumpHeight;
    body.position.y = jumpHeight;

    // Board tricks and airborne motion.
    board.rotation.z = trickTimer > 0
      ? Math.sin(trickTimer * 18) * 0.2
      : Math.sin(elapsed * 5) * 0.012;

    board.rotation.x = trickTimer > 0
      ? Math.sin(trickTimer * 12) * 0.13
      : 0;

    // Natural skating body movement.
    body.rotation.x = slideTimer > 0 ? -0.62 : 0;
    body.rotation.z = Math.sin(elapsed * 2.2) * 0.025;

    leftArm.rotation.z = -0.12 - Math.sin(elapsed * 5) * 0.09;
    rightArm.rotation.z = 0.12 + Math.sin(elapsed * 5 + 0.7) * 0.09;

    leftLeg.rotation.x = trickTimer > 0 ? -0.35 : 0;
    rightLeg.rotation.x = trickTimer > 0 ? 0.35 : 0;

    // Crouch body and arms when sliding.
    if (slideTimer > 0) {
      body.rotation.x = -0.62;
      leftArm.rotation.z = -0.3;
      rightArm.rotation.z = 0.3;
    }

    // Crash tumble animation.
    if (crashed) {
      crashTimer = Math.max(0, crashTimer - dt);

      const progress = 1 - crashTimer / 0.9;

      body.rotation.z = progress * 1.2;
      body.rotation.x = -0.45;
      leftArm.rotation.z = -1.1;
      rightArm.rotation.z = 1.1;
      leftLeg.rotation.x = -0.7;
      rightLeg.rotation.x = 0.7;

      board.rotation.z = progress * 0.85;
      board.rotation.x = progress * 0.35;
      group.rotation.z = progress * 0.12;
    }
  }

  // Clean up when the player is removed.
  function dispose() {
    if (disposed) return;

    disposed = true;
    scene.remove(group);

    group.traverse((object) => {
      if (object.geometry) object.geometry.dispose();

      if (object.material) {
        const materials = Array.isArray(object.material)
          ? object.material
          : [object.material];

        for (const material of materials) {
          material.dispose();
        }
      }
    });
  }

  return {
    group,
    update,
    setLane,
    jump,
    slide,
    trick,
    crash,
    reset,

    get jumpHeight() {
      return jumpHeight;
    },

    get isSliding() {
      return slideTimer > 0;
    },

    get trickCount() {
      return trickCount;
    },

    dispose
  };
}
