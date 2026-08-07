/**
 * Builds the arena geometry from a character grid, a palette, and (optionally)
 * the tile art.
 *
 * Walls and bushes are instanced. Thirty-two boxes is nothing for a desktop GPU
 * but it is real work for a phone, and this scene has to hold 60 frames on a
 * mid-range Android.
 *
 * Every arena in arenas.json goes through here — what makes one look like a
 * mine and another like a rooftop is entirely its palette and its grid.
 */
import * as THREE from '../../vendor/three/three.module.min.js';

const DEFAULT_PALETTE = {
  floor: '#c9a86a',
  wall: '#8a6b4f',
  wallCap: '#a8865f',
  bush: '#4f9b45',
  rim: '#5c4633',
  surround: '#241b45'
};

/**
 * Loads the three tile textures. Returns immediately with Texture objects that
 * fill in when the files arrive, so a slow image never blocks the match from
 * starting — the arena just starts flat-coloured and gains its art a moment
 * later.
 */
export function loadTileTextures(art, tilesPerRepeat = 4) {
  const loader = new THREE.TextureLoader();
  const out = {};
  if (!art) return out;

  const grab = (key, repeat) => {
    if (!art[key]) return;
    const tex = loader.load(art[key], undefined, undefined, () => {
      console.warn('[BrawlZ3D] tile art missing (' + art[key] + ') — staying flat-coloured.');
      delete out[key];
    });
    tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    if (repeat) tex.repeat.set(repeat[0], repeat[1]);
    out[key] = tex;
  };

  grab('floor', null);        // repeat is set once the grid size is known
  grab('wall', [1, 1]);
  grab('bush', [1, 1]);
  out._tilesPerRepeat = tilesPerRepeat;
  return out;
}

export function buildArena(scene, grid, opts = {}) {
  const palette = { ...DEFAULT_PALETTE, ...(opts.palette || {}) };
  const tex = opts.textures || {};
  const t = grid.tile;
  const W = grid.width;
  const D = grid.depth;
  const group = new THREE.Group();

  const toon = (color, map) => {
    const m = new THREE.MeshToonMaterial({ color: new THREE.Color(color) });
    if (map) {
      m.map = map;
      // The art already carries the colour; tinting it again muddies it.
      m.color.set(0xffffff);
    }
    return m;
  };

  /* ---------------- ground ----------------
   * An outer plane well below the arena so the camera never frames raw
   * background: past the arena rim you should read "down there is somewhere
   * else", not "the level ended". */
  const surround = new THREE.Mesh(
    new THREE.PlaneGeometry(W * 8, D * 10),
    new THREE.MeshToonMaterial({ color: new THREE.Color(palette.surround) })
  );
  surround.rotation.x = -Math.PI / 2;
  surround.position.set(W / 2, -t * 3.2, D / 2);
  group.add(surround);

  buildHorizon(group, grid, palette, t);

  const slab = new THREE.Mesh(
    new THREE.BoxGeometry(W + t * 0.7, t * 0.5, D + t * 0.7),
    toon(palette.rim)
  );
  slab.position.set(W / 2, -t * 0.25, D / 2);
  slab.receiveShadow = true;
  group.add(slab);

  if (tex.floor) {
    const per = tex._tilesPerRepeat || 4;
    tex.floor.repeat.set(grid.cols / per, grid.height / per);
  }
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), toon(palette.floor, tex.floor));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(W / 2, 0.5, D / 2);
  floor.receiveShadow = true;
  group.add(floor);

  // Without art, a faint checker gives movement something to read against.
  // With art, the stone pattern already does that job.
  if (!tex.floor) {
    const inlayMat = new THREE.MeshToonMaterial({
      color: new THREE.Color(palette.floor).multiplyScalar(0.94)
    });
    let count = 0;
    for (let r = 0; r < grid.height; r++) {
      for (let c = 0; c < grid.cols; c++) if ((r + c) % 2 === 0) count++;
    }
    const inlay = new THREE.InstancedMesh(new THREE.PlaneGeometry(t, t), inlayMat, count);
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
  }

  /* ---------------- walls and bushes ---------------- */
  const wallCells = [];
  const bushCells = [];
  for (let r = 0; r < grid.height; r++) {
    for (let c = 0; c < grid.cols; c++) {
      const ch = grid.rows[r][c];
      if (ch === '#') wallCells.push(grid.centreOf(c, r));
      else if (ch === '*') bushCells.push(grid.centreOf(c, r));
    }
  }

  const m = new THREE.Matrix4();
  const noRot = new THREE.Quaternion();
  const one = new THREE.Vector3(1, 1, 1);

  if (wallCells.length) {
    const wallH = t * 1.25;
    const walls = new THREE.InstancedMesh(
      new THREE.BoxGeometry(t, wallH, t), toon(palette.wall, tex.wall), wallCells.length
    );
    const caps = new THREE.InstancedMesh(
      new THREE.BoxGeometry(t * 1.03, t * 0.16, t * 1.03), toon(palette.wallCap), wallCells.length
    );
    walls.castShadow = walls.receiveShadow = true;
    caps.castShadow = true;

    wallCells.forEach((p, i) => {
      walls.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, wallH / 2, p.y), noRot, one));
      caps.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, wallH + t * 0.06, p.y), noRot, one));
    });
    walls.instanceMatrix.needsUpdate = true;
    caps.instanceMatrix.needsUpdate = true;
    group.add(walls, caps);
  }

  if (bushCells.length) {
    // With art, a flat leafy quad beats five spheres: the texture already has
    // all the leaf shapes, and lumpy geometry underneath just fights it.
    if (tex.bush) {
      // Leafy art on the top face, flat dark green on the sides. Wrapping the
      // top-down foliage around the sides too would smear it into stripes.
      const side = new THREE.MeshToonMaterial({
        color: new THREE.Color(palette.bush).multiplyScalar(0.55)
      });
      const top = toon(palette.bush, tex.bush);
      const bushMats = [side, side, top, side, side, side];   // +x -x +y -y +z -z
      const bushes = new THREE.InstancedMesh(
        new THREE.BoxGeometry(t * 0.99, t * 0.72, t * 0.99), bushMats, bushCells.length
      );
      bushes.castShadow = bushes.receiveShadow = true;
      bushCells.forEach((p, i) => {
        bushes.setMatrixAt(i, m.compose(new THREE.Vector3(p.x, t * 0.36, p.y), noRot, one));
      });
      bushes.instanceMatrix.needsUpdate = true;
      group.add(bushes);
    } else {
      const blobs = [
        [0, 0.40, 0, 0.50], [-0.28, 0.29, 0.22, 0.34], [0.30, 0.31, -0.20, 0.36],
        [0.12, 0.30, 0.32, 0.31], [-0.26, 0.27, -0.29, 0.29]
      ];
      const blobGeo = new THREE.SphereGeometry(1, 10, 8);
      const total = bushCells.length * blobs.length;
      const light = new THREE.InstancedMesh(blobGeo, toon(palette.bush), Math.ceil(total / 2));
      const dark = new THREE.InstancedMesh(
        blobGeo, toon(new THREE.Color(palette.bush).multiplyScalar(0.78)), Math.floor(total / 2)
      );
      light.castShadow = dark.castShadow = true;
      light.receiveShadow = dark.receiveShadow = true;

      let li = 0, di = 0, n = 0;
      bushCells.forEach((p) => {
        blobs.forEach((b) => {
          const rad = b[3] * t;
          const pos = new THREE.Vector3(p.x + b[0] * t, b[1] * t, p.y + b[2] * t);
          const scl = new THREE.Vector3(rad, rad, rad);
          if (n % 2 === 0) light.setMatrixAt(li++, m.compose(pos, noRot, scl));
          else dark.setMatrixAt(di++, m.compose(pos, noRot, scl));
          n++;
        });
      });
      light.count = li;
      dark.count = di;
      light.instanceMatrix.needsUpdate = true;
      dark.instanceMatrix.needsUpdate = true;
      group.add(light, dark);
    }
  }

  scene.add(group);
  return { group, wallCells, bushCells };
}

/**
 * A ring of distant blocks around the arena.
 *
 * Without it the camera frames a large wedge of flat background, which is what
 * makes the shot read as a diagram rather than a place — and on a phone held
 * upright that wedge is nearly half the screen. These are deliberately far
 * away and low-poly: a horizon, not a level.
 */
function buildHorizon(group, grid, palette, t) {
  const W = grid.width, D = grid.depth;
  const cx = W / 2, cz = D / 2;
  const inner = Math.max(W, D) * 0.78;
  const perRing = 46;

  const geo = new THREE.BoxGeometry(1, 1, 1);
  // Distant things go lighter and closer to the sky, not darker. Reading them
  // as scenery rather than as noise depends entirely on that direction.
  const sky = new THREE.Color(palette.sky || palette.surround);
  const nearMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(palette.rim).lerp(sky, 0.28)
  });
  const farMat = new THREE.MeshToonMaterial({
    color: new THREE.Color(palette.rim).lerp(sky, 0.62)
  });

  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const axis = new THREE.Vector3(0, 1, 0);
  const nearMesh = new THREE.InstancedMesh(geo, nearMat, perRing);
  const farMesh = new THREE.InstancedMesh(geo, farMat, perRing);
  let ni = 0, fi = 0;

  for (let i = 0; i < perRing * 2; i++) {
    const a = (i / (perRing * 2)) * Math.PI * 2 + Math.random() * 0.08;
    const ring = i % 2 === 0;
    const radius = inner * (ring ? 1 : 1.42) + Math.random() * t * 4;
    const h = t * (ring ? 2.4 + Math.random() * 3.4 : 4 + Math.random() * 6);
    const wide = t * (1.6 + Math.random() * 2.6);

    const pos = new THREE.Vector3(
      cx + Math.cos(a) * radius,
      -t * 3.2 + h / 2,
      cz + Math.sin(a) * radius * 0.82
    );
    q.setFromAxisAngle(axis, a + Math.random());
    const mat = m.compose(pos, q, new THREE.Vector3(wide, h, wide));
    if (ring) { if (ni < perRing) nearMesh.setMatrixAt(ni++, mat); }
    else if (fi < perRing) farMesh.setMatrixAt(fi++, mat);
  }
  nearMesh.count = ni;
  farMesh.count = fi;
  nearMesh.instanceMatrix.needsUpdate = true;
  farMesh.instanceMatrix.needsUpdate = true;
  group.add(nearMesh, farMesh);
}

/**
 * Lighting rig. One warm key with shadows, one cool fill, and a hemisphere so
 * nothing goes fully black — the flat, readable look the genre needs, not a
 * realistic one. The key's colour comes from the arena palette, which is most
 * of what makes a rooftop feel different from a mine.
 */
export function buildLights(scene, grid, palette = {}) {
  const W = grid.width, D = grid.depth;

  scene.add(new THREE.HemisphereLight(0xbfd8ff, 0x6b4a2a, 1.05));

  const sun = new THREE.DirectionalLight(new THREE.Color(palette.sun || '#fff0cf'), 1.9);
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
