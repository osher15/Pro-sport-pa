/**
 * Projectile shapes.
 *
 * Every character used to fire the same white ball. A shot is the thing you
 * look at most in a match, so it is also the cheapest place to make six
 * characters feel like six characters: the cactus throws a spinning thorn, the
 * shark fires a torpedo, the grandma lobs a wobbling ball of yarn.
 *
 * Shapes are built pointing along +Z so a single yaw aims them, and pooled per
 * shape — a twelve-shard ultimate must not allocate twelve meshes mid-fight.
 */
import * as THREE from '../../vendor/three/three.module.min.js';

const POOL_PER_SHAPE = 16;

/**
 * Geometry builders. Each returns a unit-ish shape centred on the origin and
 * facing +Z, so `rotation.y = PI/2 - angle` aims any of them.
 */
const SHAPES = {
  orb() {
    return new THREE.SphereGeometry(1, 12, 10);
  },

  thorn() {
    const g = new THREE.ConeGeometry(0.62, 2.4, 6);
    g.rotateX(Math.PI / 2);          // tip forward
    return g;
  },

  torpedo() {
    const g = new THREE.CapsuleGeometry(0.62, 1.9, 5, 10);
    g.rotateX(Math.PI / 2);
    return g;
  },

  wave() {
    // A flattened ring: a shout, not a bullet.
    const g = new THREE.TorusGeometry(1.05, 0.3, 6, 14);
    g.scale(1, 1, 0.42);
    return g;
  },

  bolt() {
    const g = new THREE.CapsuleGeometry(0.5, 1.2, 4, 8);
    g.rotateX(Math.PI / 2);
    return g;
  },

  /* ---------------- elemental ----------------
   * These are meant to be too big. A brawler's shot is the loudest thing on
   * the screen and it should look like the character threw a piece of the
   * world, not like a pellet left the barrel. */

  /** A teardrop of flame, wide at the back and drawn to a point in front. */
  flame() {
    const g = new THREE.SphereGeometry(1, 12, 10);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i);
      // Pull the leading half into a cone and fatten the trailing half.
      const k = z > 0 ? 1 + z * 1.4 : 1 - z * 0.35;
      pos.setX(i, pos.getX(i) / k);
      pos.setY(i, pos.getY(i) / k);
      pos.setZ(i, z * 2.1);
    }
    g.computeVertexNormals();
    return g;
  },

  /** A blob of water: squashed, wobbly, faceted enough to catch the light. */
  splash() {
    const g = new THREE.IcosahedronGeometry(1, 1);
    g.scale(1.05, 0.82, 1.45);
    return g;
  },

  /** A jagged shard of ice. */
  shard() {
    const g = new THREE.OctahedronGeometry(1, 0);
    g.scale(0.68, 0.68, 2.2);
    return g;
  },

  /** A crackling bolt: a thin core with a flared head. */
  spark() {
    const g = new THREE.ConeGeometry(0.85, 2.8, 5);
    g.rotateX(Math.PI / 2);
    return g;
  }
};

/** How each shape behaves in flight. */
const MOTION = {
  orb:     { spin: 5, wobble: 0.22, trailEvery: 0.045, trailScale: 0.72 },
  thorn:   { spin: 22, wobble: 0, trailEvery: 0.026, trailScale: 0.5 },
  torpedo: { spin: 0, wobble: 0, trailEvery: 0.02, trailScale: 0.85 },
  wave:    { spin: 1.5, wobble: 0, trailEvery: 0.055, trailScale: 1.0 },
  bolt:    { spin: 8, wobble: 0, trailEvery: 0.038, trailScale: 0.65 },

  // The elemental shots run hot: fast trails, visible flicker, and a pulse
  // that makes the projectile itself breathe as it flies.
  flame:   { spin: 3, wobble: 0.1, trailEvery: 0.016, trailScale: 1.15,
             flicker: 0.28, glow: 1.0 },
  splash:  { spin: 7, wobble: 0.3, trailEvery: 0.02, trailScale: 1.0,
             flicker: 0.16, glow: 0.7 },
  shard:   { spin: 12, wobble: 0, trailEvery: 0.024, trailScale: 0.8,
             flicker: 0.08, glow: 0.85 },
  spark:   { spin: 26, wobble: 0.18, trailEvery: 0.014, trailScale: 0.9,
             flicker: 0.42, glow: 1.1 }
};

export class ProjectileView {
  constructor(scene) {
    this.scene = scene;
    this.pools = new Map();
    // Shared with the rigs on purpose: a shot drawn flat and unlit next to
    // outlined, shaded characters reads as a sticker pasted over the game.
    this.outlineMat = new THREE.MeshBasicMaterial({
      color: 0x1d1630, side: THREE.BackSide
    });
  }

  motionFor(shape) {
    return MOTION[shape] || MOTION.bolt;
  }

  /** Pools are built on first use, so an unused shape costs nothing. */
  acquire(shape) {
    const key = SHAPES[shape] ? shape : 'bolt';
    let pool = this.pools.get(key);
    if (!pool) {
      const geo = SHAPES[key]();
      pool = { geo, meshes: [], next: 0 };
      for (let i = 0; i < POOL_PER_SHAPE; i++) {
        const mesh = new THREE.Mesh(geo, new THREE.MeshToonMaterial({
          color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.45
        }));
        // Its own outline shell, so the shot carries the same ink line the
        // characters and the walls do.
        const shell = new THREE.Mesh(geo, this.outlineMat);
        shell.scale.multiplyScalar(1.16);
        mesh.add(shell);
        mesh.castShadow = true;
        mesh.visible = false;
        this.scene.add(mesh);
        pool.meshes.push(mesh);
      }
      this.pools.set(key, pool);
    }
    const mesh = pool.meshes[pool.next++ % pool.meshes.length];
    mesh.visible = true;
    return mesh;
  }

  /** Colours a shot and its glow together. */
  paint(mesh, hex) {
    mesh.material.color.setHex(hex);
    mesh.material.emissive.setHex(hex);
  }

  dispose() {
    for (const pool of this.pools.values()) {
      pool.geo.dispose();
      pool.meshes.forEach((m) => { this.scene.remove(m); m.material.dispose(); });
    }
    this.outlineMat.dispose();
    this.pools.clear();
  }
}

/**
 * The second colour an elemental shot needs.
 *
 * Fire is not orange, it is orange *and* yellow; water is not blue, it is blue
 * and white. One flat colour is what made the old shots read as plastic. The
 * trail is drawn in this lighter tone so the shot has a hot centre.
 */
export function coreColour(hex) {
  const c = new THREE.Color(hex);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  return c.setHSL(
    (hsl.h + 0.055) % 1,
    Math.max(0, hsl.s - 0.25),
    Math.min(0.93, hsl.l + 0.32)
  ).getHex();
}

/**
 * Per-shot variation.
 *
 * Twelve identical shards look like a printout. Nudging hue, size and roll a
 * few percent each makes a volley read as a volley — the eye picks up the
 * irregularity long before it can name it.
 */
export function jitterShot(baseColor, size) {
  const c = new THREE.Color(baseColor);
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  c.setHSL(
    (hsl.h + (Math.random() - 0.5) * 0.026 + 1) % 1,
    Math.min(1, hsl.s * (0.9 + Math.random() * 0.2)),
    Math.min(0.92, hsl.l * (0.92 + Math.random() * 0.22))
  );
  return {
    color: c.getHex(),
    scale: size * (0.9 + Math.random() * 0.22),
    roll: Math.random() * Math.PI * 2,
    spinSign: Math.random() < 0.5 ? -1 : 1
  };
}
