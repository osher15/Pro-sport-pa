/**
 * Builds the arena geometry from the same character grid the 2D build uses.
 *
 * Walls and bushes are instanced: 32 boxes and 5 blobs per bush is nothing for
 * a desktop GPU but it is real work for a phone, and this scene has to hold 60
 * frames on a mid-range Android.
 */
import * as THREE from '../../vendor/three/three.module.min.js';

const OUTLINE = new THREE.MeshBasicMaterial({ color: 0x1d1630, side: THREE.BackSide });

export function buildArena(scene, grid, palette = {}) {
  const t = grid.tile;
  const W = grid.width;
  const D = grid.depth;
  const group = new THREE.Group();

  const colors = {
    floor: 0xc9a86a,
    // Only a few percent darker: the checker is there to give movement
    // something to read against, not to be the loudest thing on screen.
    floorInlay: 0xc0a065,
    wall: 0x8a6b4f,
    wallCap: 0xa8865f,
    bush: 0x4f9b45,
    bushDark: 0x3a7533,
    rim: 0x5c4633,
    ...palette
  };

  /* ---------------- ground ----------------
   * An outer plane well below the arena so the camera never frames raw
   * background: past the arena rim you should read "down there is somewhere
   * else", not "the level ended". */
  const surround = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 6, D * 8),
    new THREE.MeshToonMaterial({ color: 0x241b45 })
  );
  surround.rotation.x = -Math.PI / 2;
  surround.position.set(W / 2, -t * 3.2, D / 2);
  group.add(surround);

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(W + t * 0.7, t * 0.5, D + t * 0.7),
    new THREE.MeshToonMaterial({ color: colors.rim })
  );
  slab.position.set(W / 2, -t * 0.25, D / 2);
  slab.receiveShadow = true;
  group.add(slab);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(W, D),
    new THREE.MeshToonMaterial({ color: colors.floor })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0.5, D / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // A faint checker so movement has something to read against. Two big planes
  // beat a texture we do not have yet, and the tile art can replace this later.
  const inlayGeo = new THREE.PlaneGeometry(t, t);
  const inlayMat = new THREE.MeshToonMaterial({ color: colors.floorInlay });
  let inlayCount = 0;
  for (let r = 0; r < grid.height; r++) {
    for (let c = 0; c < grid.cols; c++) if ((r + c) % 2 === 0) inlayCount++;
  }
  const inlay = new THREE.InstancedMesh(inlayGeo, inlayMat, inlayCount);
  inlay.receiveShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2);
  const one = new THREE.Vector3(1, 1, 1);
  let i = 0;
  for (let r = 0; r < grid.height; r++) {
    for (let c = 0; c < grid.cols; c++) {
      if ((r + c) % 2 !== 0) continue;
      const p = grid.centreOf(c, r);
      inlay.setMatrixAt(i++, m.compose(new THREE.Vector3(p.x, 0.8, p.y), q, one));
    }
  }
  inlay.instanceMatrix.needsUpdate = true;
  group.add(inlay);

  /* ---------------- walls ---------------- */
  const wallCells = [];
  const bushCells = [];
  for (let r = 0; r < grid.height; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const ch = grid.rows[r][c];
      if (ch === '#') wallCells.push(grid.centreOf(c, r));
      else if (ch === '*') bushCells.push(grid.centreOf(c, r));
    }
  }

  const wallH = t * 1.25;
  const wallGeo = new THREE.BoxGeometry(t, wallH, t);
  const walls = new THREE.InstancedMesh(
    wallGeo, new THREE.MeshToonMaterial({ color: colors.wall }), wallCells.length
  );
  const wallOutline = new THREE.InstancedMesh(wallGeo, OUTLINE, wallCells.length);
  const capGeo = new THREE.BoxGeometry(t * 1.03, t * 0.16, t * 1.03);
  const caps = new THREE.InstancedMesh(
    capGeo, new THREE.MeshToonMaterial({ color: colors.wallCap }), wallCells.length
  );
  walls.castShadow = walls.receiveShadow = true;
  caps.castShadow = true;

  const noRot = new THREE.Quaternion();
  wallCells.forEach((p, idx) => {
    walls.setMatrixAt(idx, m.compose(new THREE.Vector3(p.x, wallH / 2, p.y), noRot, one));
    wallOutline.setMatrixAt(idx, m.compose(
      new THREE.Vector3(p.x, wallH / 2, p.y), noRot, new THREE.Vector3(1.04, 1.02, 1.04)
    ));
    caps.setMatrixAt(idx, m.compose(new THREE.Vector3(p.x, wallH + t * 0.06, p.y), noRot, one));
  });
  [walls, wallOutline, caps].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  group.add(wallOutline, walls, caps);

  /* ---------------- bushes ---------------- */
  const blobs = [
    [0, 0.40, 0, 0.50], [-0.28, 0.29, 0.22, 0.34], [0.30, 0.31, -0.20, 0.36],
    [0.12, 0.30, 0.32, 0.31], [-0.26, 0.27, -0.29, 0.29]
  ];
  const blobGeo = new THREE.SphereGeometry(1, 10, 8);
  const total = bushCells.length * blobs.length;
  const bushLight = new THREE.InstancedMesh(
    blobGeo, new THREE.MeshToonMaterial({ color: colors.bush }), Math.ceil(total / 2)
  );
  const bushDark = new THREE.InstancedMesh(
    blobGeo, new THREE.MeshToonMaterial({ color: colors.bushDark }), Math.floor(total / 2)
  );
  bushLight.castShadow = bushDark.castShadow = true;
  bushLight.receiveShadow = bushDark.receiveShadow = true;

  let li = 0, di = 0, n = 0;
  bushCells.forEach((p) => {
    blobs.forEach((b) => {
      const rad = b[3] * t;
      const pos = new THREE.Vector3(p.x + b[0] * t, b[1] * t, p.y + b[2] * t);
      const scl = new THREE.Vector3(rad, rad, rad);
      if (n % 2 === 0) bushLight.setMatrixAt(li++, m.compose(pos, noRot, scl));
      else bushDark.setMatrixAt(di++, m.compose(pos, noRot, scl));
      n++;
    });
  });
  bushLight.count = li;
  bushDark.count = di;
  bushLight.instanceMatrix.needsUpdate = true;
  bushDark.instanceMatrix.needsUpdate = true;
  group.add(bushLight, bushDark);

  scene.add(group);
  return { group, wallCells, bushCells };
}

/**
 * Lighting rig. One warm key with shadows, one cool fill, and a hemisphere so
 * nothing goes fully black — the flat, readable look the genre needs, not a
 * realistic one.
 */
export function buildLights(scene, grid) {
  const W = grid.width, D = grid.depth;

  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x6b4a2a, 1.05));

  const sun = new THREE.DirectionalLight(0xfff0cf, 1.9);
  sun.position.set(W * 0.28, 1500, D * 1.15);
  sun.target.position.set(W / 2, 0, D / 2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const span = Math.max(W, D) * 0.62;
  Object.assign(sun.shadow.camera, {
    left: -span, right: span, top: span, bottom: -span, near: 400, far: 3000
  });
  sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias = -0.0015;
  sun.shadow.normalBias = 2;
  scene.add(sun, sun.target);

  const fill = new THREE.DirectionalLight(0x9fb8ff, 0.5);
  fill.position.set(W * 0.9, 700, -D * 0.4);
  scene.add(fill);

  return { sun, fill };
}
