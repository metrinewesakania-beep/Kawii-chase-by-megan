
 // src/player.js
 // KAWIIS CHASE WITH MEGAN — enhanced free-skating player
 // Keeps the existing player API and adds free movement and turning.

export function createPlayer({ THREE, scene }) {
  const group = new THREE.Group();
  group.name = "MeganSkater";
  scene.add(group);

  const material = (color, roughness = 0.55, metalness = 0.08) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const mats = {
    hoodie: material(0x6428b8),
    purple: material(0xa36cff),
    pants: material(0x202638),
    skin: material(0xb97c5c),
    shoes: material(0xf4f5ff),
    cyan: material(0x32e9ff, 0.3, 0.3),
    pink: material(0xff4ecb, 0.35, 0.2),
    dark: material(0x11131d),
    deck: material(0x292039),
    rubber: material(0x080a10, 0.8),
    metal: material(0x9aa8b8, 0.25, 0.7)
  };

  function mesh(parent, geometry, mat, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, mat);
    object.position.set(x, y, z);
    object.castShadow = true;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }

  function box(parent, mat, size, pos) {
    return mesh(
      parent,
      new THREE.BoxGeometry(...size),
      mat,
      ...pos
    );
  }

  function ball(parent, mat, radius, pos) {
    return mesh(
      parent,
      new THREE.SphereGeometry(radius, 16, 12),
      mat,
      ...pos
    );
  }

  function limb(parent, mat, radius, length, pos) {
    const pivot = new THREE.Group();
    pivot.position.set(...pos);
    parent.add(pivot);

    mesh(
      pivot,
      new THREE.CylinderGeometry(radius * 0.85, radius, length, 12),
      mat,
      0,
      -length / 2,
      0
    );

    ball(pivot, mat, radius, [0, 0, 0]);
    return pivot;
  }

  // SKATEBOARD
  const board = new THREE.Group();
  board.name = "Skateboard";
  group.add(board);

  box(board, mats.deck, [0.9, 0.08, 1.95], [0, 0.22, 0]);
  box(board, mats.dark, [0.78, 0.025, 1.68], [0, 0.275, 0]);

  for (const x of [-0.405, 0.405]) {
    box(board, mats.cyan, [0.025, 0.025, 1.5], [x, 0.29, 0]);
  }

  box(board, mats.pink, [0.23, 0.025, 0.4], [0, 0.29, 0]);

  const wheels = [];

  for (const z of [-0.62, 0.62]) {
    box(board, mats.metal, [0.56, 0.045, 0.12], [0, 0.15, z]);

    for (const x of [-0.4, 0.4]) {
      const wheel = mesh(
        board,
        new THREE.CylinderGeometry(0.12, 0.12, 0.1, 18),
        mats.rubber,
        x,
        0.1,
        z
      );

      wheel.rotation.z = Math.PI / 2;
      wheels.push(wheel);

      const hub = mesh(
        board,
        new THREE.CylinderGeometry(0.045, 0.045, 0.105, 12),
        mats.cyan,
        x,
        0.1,
        z
      );

      hub.rotation.z = Math.PI / 2;
    }
  }

  // SKATER BODY
  const body = new THREE.Group();
  body.name = "SkaterBody";
  group.add(body);

  const torso = mesh(
    body,
    new THREE.CapsuleGeometry(0.3, 0.48, 5, 14),
    mats.hoodie,
    0,
    1.62,
    0
  );
  torso.scale.set(1.08, 1.1, 0.8);

  box(body, mats.purple, [0.43, 0.1, 0.04], [0, 1.82, 0.24]);
  box(body, mats.cyan, [0.035, 0.36, 0.025], [0, 1.58, 0.25]);

  const hood = ball(body, mats.purple, 0.27, [0, 2.13, -0.06]);
  hood.scale.set(1.05, 1.05, 0.9);

  ball(body, mats.skin, 0.22, [0, 2.19, 0.04]);

  const hair = ball(body, mats.dark, 0.235, [0, 2.31, -0.035]);
  hair.scale.set(1.04, 0.62, 0.92);

  box(body, mats.dark, [0.29, 0.06, 0.035], [0, 2.19, 0.25]);
  box(body, mats.cyan, [0.075, 0.02, 0.02], [-0.07, 2.19, 0.275]);
  box(body, mats.cyan, [0.075, 0.02, 0.02], [0.07, 2.19, 0.275]);

  const leftArm = new THREE.Group();
  leftArm.position.set(-0.35, 1.85, 0);
  body.add(leftArm);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.35, 1.85, 0);
  body.add(rightArm);

  limb(leftArm, mats.purple, 0.1, 0.34, [0, -0.04, 0]);
  limb(leftArm, mats.hoodie, 0.08, 0.3, [0, -0.36, 0.02]);
  ball(leftArm, mats.skin, 0.08, [0, -0.56, 0.02]);

  limb(rightArm, mats.purple, 0.1, 0.34, [0, -0.04, 0]);
  limb(rightArm, mats.hoodie, 0.08, 0.3, [0, -0.36, 0.02]);
  ball(rightArm, mats.skin, 0.08, [0, -0.56, 0.02]);

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.17, 1.19, 0);
  body.add(leftLeg);

  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.17, 1.19, 0);
  body.add(rightLeg);

  limb(leftLeg, mats.pants, 0.11, 0.39, [0, -0.06, 0]);
  limb(leftLeg, mats.pants, 0.09, 0.31, [0, -0.4, 0.02]);
  limb(rightLeg, mats.pants, 0.11, 0.39, [0, -0.06, 0]);
  limb(rightLeg, mats.pants, 0.09, 0.31, [0, -0.4, 0.02]);

  box(leftLeg, mats.shoes, [0.25, 0.14, 0.38], [0, -0.65, 0.09]);
  box(rightLeg, mats.shoes, [0.25, 0.14, 0.38], [0, -0.65, 0.09]);
  box(leftLeg, mats.cyan, [0.2, 0.025, 0.12], [0, -0.58, 0.19]);
  box(rightLeg, mats.cyan, [0.2, 0.025, 0.12], [0, -0.58, 0.19]);

  // MOVEMENT AND ANIMATION STATE
  const lanes = [-3.2, 0, 3.2];

  let lane = 1;
  let jumpVelocity = 0;
  let jumpHeight = 0;
  let slideTimer = 0;
  let trickTimer = 0;
  let elapsed = 0;
  let crashed = false;
  let crashTimer = 0;
  let disposed = false;

  let steer = 0;
  let throttle = 0;
  let targetYaw = 0;
  let speed = 0;

  const maxSpeed = 12;
  const acceleration = 18;
  const braking = 22;
  const steeringSpeed = 1.9;
  const damping = 3.5;

  function setLane(direction) {
    if (crashed) return;

    lane = THREE.MathUtils.clamp(
      lane + Math.sign(direction),
      0,
      lanes.length - 1
    );

    // Compatible with the original three-lane controls.
    targetYaw = -Math.sign(direction) * 0.12;
  }

  // New free-movement API. Call move(-1/1) to steer
  // or move(0, -1/1) to brake/accelerate.
  function move(horizontal = 0, forward = 0) {
    if (crashed) return;
    steer = THREE.MathUtils.clamp(horizontal, -1, 1);
    throttle = THREE.MathUtils.clamp(forward, -1, 1);
  }

  function turn(direction) {
    if (crashed) return;
    targetYaw += THREE.MathUtils.clamp(direction, -1, 1) * 0.12;
    targetYaw = THREE.MathUtils.clamp(targetYaw, -1.25, 1.25);
  }

  function jump() {
    if (!crashed && jumpHeight <= 0.02 && slideTimer <= 0) {
      jumpVelocity = 8.5;
    }
  }

  function slide() {
    if (!crashed && jumpHeight <= 0.05) {
      slideTimer = 0.9;
    }
  }

  function trick() {
    if (!crashed && jumpHeight > 0.2) {
      trickTimer = 0.65;
      return true;
    }
    return false;
  }

  function crash() {
    if (crashed) return;
    crashed = true;
    crashTimer = 1.1;
    speed = 0;
    steer = 0;
    throttle = 0;
  }

  function reset() {
    lane = 1;
    jumpVelocity = 0;
    jumpHeight = 0;
    slideTimer = 0;
    trickTimer = 0;
    elapsed = 0;
    crashTimer = 0;
    crashed = false;
    steer = 0;
    throttle = 0;
    targetYaw = 0;
    speed = 0;

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

  function update(delta) {
    const dt = Math.min(Math.max(delta || 0, 0), 0.04);
    if (disposed) return;

    elapsed += dt;
    slideTimer = Math.max(0, slideTimer - dt);
    trickTimer = Math.max(0, trickTimer - dt);

    if (!crashed) {
      // Accelerate, coast, or brake.
      if (throttle > 0) {
        speed = Math.min(maxSpeed, speed + acceleration * throttle * dt);
      } else if (throttle < 0) {
        speed = Math.max(0, speed + braking * throttle * dt);
      } else {
        speed = Math.max(0, speed - damping * dt);
      }

      // Free steering and smooth turning.
      group.rotation.y = THREE.MathUtils.damp(
        group.rotation.y,
        targetYaw + steer * 0.32,
        steeringSpeed,
        dt
      );

      // Movement follows the direction the skater faces.
      group.position.x += Math.sin(group.rotation.y) * speed * dt;
      group.position.z += Math.cos(group.rotation.y) * speed * dt;

      // Keep the original lane-based controls usable.
      if (Math.abs(steer) < 0.01 && Math.abs(targetYaw) < 0.01 && throttle === 0) {
        group.position.x = THREE.MathUtils.damp(
          group.position.x,
          lanes[lane],
          4,
          dt
        );
      }
    } else {
      crashTimer = Math.max(0, crashTimer - dt);
      const progress = 1 - crashTimer / 1.1;

      body.rotation.z = progress * 1.2;
      body.rotation.x = -0.45;
      leftArm.rotation.z = -1.1;
      rightArm.rotation.z = 1.1;
      leftLeg.rotation.x = -0.7;
      rightLeg.rotation.x = 0.7;
      board.rotation.z = progress * 0.8;
      board.rotation.x = progress * 0.3;
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

    board.position.y = jumpHeight;
    body.position.y = jumpHeight;

    // Crouching while riding.
    if (!crashed) {
      body.rotation.x = slideTimer > 0 ? -0.62 : 0;
      leftArm.rotation.z = slideTimer > 0 ? -0.3 : -0.12;
      rightArm.rotation.z = slideTimer > 0 ? 0.3 : 0.12;

      // Airborne trick movement.
      board.rotation.z = trickTimer > 0
        ? Math.sin(trickTimer * 18) * 0.2
        : Math.sin(elapsed * 5) * 0.012;

      board.rotation.x = trickTimer > 0
        ? Math.sin(trickTimer * 12) * 0.13
        : 0;

      leftLeg.rotation.x = trickTimer > 0 ? -0.35 : 0;
      rightLeg.rotation.x = trickTimer > 0 ? 0.35 : 0;

      // Lean slightly when steering.
      body.rotation.z = -steer * 0.12;
    }

    for (const wheel of wheels) {
      wheel.rotation.x += speed * dt * 2;
    }
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(group);

    group.traverse(object => {
      if (object.geometry) object.geometry.dispose();

      if (object.material) {
        const list = Array.isArray(object.material)
          ? object.material
          : [object.material];

        for (const mat of list) mat.dispose();
      }
    });
  }

  return {
    group,
    update,
    setLane,
    move,
    turn,
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

    get speed() {
      return speed;
    },

    dispose
  };
}
