// src/player.js
// Player factory returning a skater built from primitive meshes
export function createPlayer({ THREE, scene }) {
  const group = new THREE.Group();
  scene.add(group);

  const material = (color, roughness = 0.45, metalness = 0.15) =>
    new THREE.MeshStandardMaterial({ color, roughness, metalness });

  const purple = material(0x9b52ff);
  const cyan = material(0x57f4ff, 0.25, 0.45);
  const dark = material(0x171324);
  const skin = material(0xc98d6d);
  const white = material(0xf6f2ff);
  const wheelMat = material(0x070711, 0.8);

  function part(parent, geometry, mat, x, y, z) {
    const mesh = new THREE.Mesh(geometry, mat);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  }

  const board = new THREE.Group();
  group.add(board);

  part(board, new THREE.BoxGeometry(1.05, 0.1, 2.05), dark, 0, 0.23, 0);
  part(board, new THREE.BoxGeometry(0.95, 0.035, 1.7), cyan, 0, 0.29, 0);

  for (const z of [-0.62, 0.62]) {
    for (const x of [-0.42, 0.42]) {
      const wheel = part(board, new THREE.CylinderGeometry(0.13, 0.13, 0.11, 12), wheelMat, x, 0.12, z);
      wheel.rotation.z = Math.PI / 2;
    }
  }

  const body = new THREE.Group();
  group.add(body);

  part(body, new THREE.BoxGeometry(0.72, 0.9, 0.38), purple, 0, 1.65, 0);
  part(body, new THREE.SphereGeometry(0.3, 16, 12), skin, 0, 2.35, 0);
  part(body, new THREE.BoxGeometry(0.45, 0.12, 0.42), dark, 0, 2.59, 0);
  part(body, new THREE.BoxGeometry(0.5, 0.09, 0.46), cyan, 0, 2.54, -0.01);

  const leftArm = part(body, new THREE.BoxGeometry(0.18, 0.76, 0.2), white, -0.49, 1.68, 0);
  const rightArm = part(body, new THREE.BoxGeometry(0.18, 0.76, 0.2), white, 0.49, 1.68, 0);
  leftArm.rotation.z = -0.18;
  rightArm.rotation.z = 0.18;

  const leftLeg = part(body, new THREE.BoxGeometry(0.23, 0.7, 0.25), dark, -0.2, 1.0, 0);
  const rightLeg = part(body, new THREE.BoxGeometry(0.23, 0.7, 0.25), dark, 0.2, 1.0, 0);
  part(body, new THREE.BoxGeometry(0.3, 0.16, 0.48), cyan, -0.2, 0.64, -0.08);
  part(body, new THREE.BoxGeometry(0.3, 0.16, 0.48), cyan, 0.2, 0.64, -0.08);

  const lanes = [-3.2, 0, 3.2];
  let lane = 1;
  let jumpVelocity = 0;
  let jumpHeight = 0;
  let slideTimer = 0;
  let trickTimer = 0;
  let trickCount = 0;
  let disposed = false;

  function setLane(direction) {
    lane = THREE.MathUtils.clamp(lane + Math.sign(direction), 0, 2);
  }

  function jump() {
    if (jumpHeight <= 0.02 && slideTimer <= 0) {
      jumpVelocity = 8.5;
    }
  }

  function slide() {
    slideTimer = 0.75;
  }

  function trick() {
    if (jumpHeight > 0.2) {
      trickTimer = 0.55;
      trickCount += 1;
      return true;
    }
    return false;
  }

  function update(delta) {
    const dt = Math.min(delta, 0.04);
    group.position.x = THREE.MathUtils.damp(group.position.x, lanes[lane], 12, dt);

    if (jumpVelocity !== 0 || jumpHeight > 0) {
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
    board.rotation.z = trickTimer > 0 ? Math.sin(trickTimer * 18) * 0.18 : 0;
    body.position.y = jumpHeight;
    body.rotation.x = slideTimer > 0 ? -0.65 : 0;
    body.rotation.z = trickTimer > 0 ? Math.sin(trickTimer * 18) * 0.2 : 0;
    leftLeg.rotation.x = trickTimer > 0 ? -0.4 : 0;
    rightLeg.rotation.x = trickTimer > 0 ? 0.4 : 0;
  }

  function dispose() {
    if (disposed) return;
    disposed = true;
    scene.remove(group);
    group.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
      if (obj.material) {
        for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) {
          m.dispose();
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
    get jumpHeight() { return jumpHeight; },
    get isSliding() { return slideTimer > 0; },
    get trickCount() { return trickCount; },
    dispose
  };
}
