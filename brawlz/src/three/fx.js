/**
 * Hit feedback: rings, sparks, scorch marks, falling shadows and screen shake.
 *
 * All of it is pooled. Allocating a mesh per explosion is fine on a desktop and
 * is exactly what makes a phone stutter at the moment the fight gets busy —
 * which is the one moment it must not.
 */
import * as THREE from '../../vendor/three/three.module.min.js';

const RING_POOL = 14;
const SPARK_POOL = 10;
const DECAL_POOL = 12;
const TRAIL_POOL = 48;

export class Fx {
  constructor(scene) {
    this.scene = scene;
    this.time = 0;

    this.shakeTime = 0;
    this.shakeAmount = 0;
    this.shakeOffset = new THREE.Vector3();

    /* ---- expanding ground rings ---- */
    const ringGeo = new THREE.RingGeometry(0.82, 1, 40);
    this.rings = [];
    for (let i = 0; i < RING_POOL; i++) {
      const mesh = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide,
        depthWrite: false
      }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.rings.push({ mesh, life: 0, duration: 0, radius: 0 });
    }

    /* ---- spark bursts ---- */
    const sparkGeo = new THREE.IcosahedronGeometry(1, 0);
    this.sparks = [];
    for (let i = 0; i < SPARK_POOL; i++) {
      const group = new THREE.Group();
      const bits = [];
      for (let b = 0; b < 7; b++) {
        const m = new THREE.Mesh(sparkGeo, new THREE.MeshBasicMaterial({
          color: 0xffffff, transparent: true, opacity: 0
        }));
        group.add(m);
        bits.push({ mesh: m, dir: new THREE.Vector3(), spin: 0 });
      }
      group.visible = false;
      scene.add(group);
      this.sparks.push({ group, bits, life: 0, duration: 0 });
    }

    /* ---- scorch decals left behind by impacts ---- */
    const decalGeo = new THREE.CircleGeometry(1, 24);
    this.decals = [];
    for (let i = 0; i < DECAL_POOL; i++) {
      const mesh = new THREE.Mesh(decalGeo, new THREE.MeshBasicMaterial({
        color: 0x2a1a12, transparent: true, opacity: 0, depthWrite: false
      }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      scene.add(mesh);
      this.decals.push({ mesh, life: 0, duration: 0 });
    }

    /* ---- flight trails ----
     * Ghosts dropped behind a projectile, shrinking and fading. Cheaper than a
     * ribbon, and it reads better at this camera distance because each ghost is
     * a shape the eye can actually resolve. */
    const trailGeo = new THREE.SphereGeometry(1, 6, 5);
    this.trails = [];
    for (let i = 0; i < TRAIL_POOL; i++) {
      const mesh = new THREE.Mesh(trailGeo, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0, depthWrite: false
      }));
      mesh.visible = false;
      scene.add(mesh);
      this.trails.push({ mesh, life: 0, duration: 0, size: 1 });
    }

    this._ring = 0;
    this._spark = 0;
    this._decal = 0;
    this._trail = 0;
  }

  /** One ghost behind a projectile. `stretch` elongates it along travel. */
  trail(x, y, color, size, angle = 0, stretch = 1) {
    const slot = this.trails[this._trail++ % this.trails.length];
    slot.mesh.position.set(x, 46, y);
    slot.mesh.material.color.setHex(color);
    slot.mesh.rotation.y = Math.PI / 2 - angle;
    slot.mesh.visible = true;
    slot.life = 0.24;
    slot.duration = 0.24;
    slot.size = size;
    slot.stretch = stretch;
  }

  /** The flash at the muzzle, on the frame the shot leaves. */
  muzzle(x, y, angle, color, size = 26) {
    const slot = this.sparks[this._spark++ % this.sparks.length];
    slot.group.position.set(x + Math.cos(angle) * size, 46, y + Math.sin(angle) * size);
    slot.group.visible = true;
    slot.life = 0.16;
    slot.duration = 0.16;
    slot.bits.forEach((bit, i) => {
      if (i >= 4) { bit.mesh.visible = false; return; }
      bit.mesh.visible = true;
      bit.mesh.material.color.setHex(color);
      // Thrown forward in a narrow cone, not scattered — a muzzle flash points.
      const spread = angle + (Math.random() - 0.5) * 0.9;
      const v = 90 + Math.random() * 70;
      bit.dir.set(Math.cos(spread) * v, 0, Math.sin(spread) * v);
      bit.mesh.position.set(0, 0, 0);
      bit.mesh.scale.setScalar(size * (0.2 + Math.random() * 0.25));
      bit.spin = (Math.random() - 0.5) * 20;
    });
  }

  /* ------------------------------------------------------------------ */

  /**
   * A low, fast puff where a foot lands. Tiny and short on purpose: it is a
   * contact cue, not an effect, and a footstep that draws the eye is worse
   * than no footstep at all.
   */
  dust(x, y, scale = 1) {
    const slot = this.rings[this._ring++ % this.rings.length];
    slot.mesh.position.set(x, 2.5, y);
    slot.mesh.material.color.setHex(0xd8c8a8);
    slot.mesh.visible = true;
    slot.life = 0.26;
    slot.duration = 0.26;
    slot.radius = 22 * scale;
  }

  shockwave(x, y, radius, color = 0xffffff, duration = 0.45) {
    const slot = this.rings[this._ring++ % this.rings.length];
    slot.mesh.position.set(x, 3, y);
    slot.mesh.material.color.set(color);
    slot.mesh.visible = true;
    slot.life = duration;
    slot.duration = duration;
    slot.radius = radius;
  }

  sparkBurst(x, y, color = 0xffe08a, count = 7, spread = 60) {
    const slot = this.sparks[this._spark++ % this.sparks.length];
    slot.group.position.set(x, 34, y);
    slot.group.visible = true;
    slot.life = 0.38;
    slot.duration = 0.38;
    slot.bits.forEach((bit, i) => {
      if (i >= count) { bit.mesh.visible = false; return; }
      bit.mesh.visible = true;
      bit.mesh.material.color.set(color);
      const a = Math.random() * Math.PI * 2;
      const up = 0.5 + Math.random();
      bit.dir.set(Math.cos(a) * spread, up * spread, Math.sin(a) * spread);
      bit.mesh.position.set(0, 0, 0);
      bit.mesh.scale.setScalar(3 + Math.random() * 4);
      bit.spin = (Math.random() - 0.5) * 14;
    });
  }

  scorch(x, y, radius, duration = 6) {
    const slot = this.decals[this._decal++ % this.decals.length];
    slot.mesh.position.set(x, 2, y);
    slot.mesh.scale.setScalar(radius);
    slot.mesh.visible = true;
    slot.life = duration;
    slot.duration = duration;
  }

  shake(duration, amount) {
    // Never shorten a bigger shake that is already running.
    if (amount < this.shakeAmount && this.shakeTime > 0) return;
    this.shakeTime = duration;
    this.shakeAmount = amount;
  }

  /* ------------------------------------------------------------------ */

  update(dt) {
    this.time += dt;

    for (const r of this.rings) {
      if (r.life <= 0) continue;
      r.life -= dt;
      const t = 1 - r.life / r.duration;
      if (r.life <= 0) { r.mesh.visible = false; r.mesh.material.opacity = 0; continue; }
      // Fast out, slow settle — an explosion that expands linearly reads as a
      // growing circle, not as a blast.
      const eased = 1 - Math.pow(1 - t, 3);
      r.mesh.scale.setScalar(r.radius * (0.25 + eased * 0.95));
      r.mesh.material.opacity = 0.85 * (1 - t);
    }

    for (const s of this.sparks) {
      if (s.life <= 0) continue;
      s.life -= dt;
      const t = 1 - s.life / s.duration;
      if (s.life <= 0) { s.group.visible = false; continue; }
      s.bits.forEach((bit) => {
        if (!bit.mesh.visible) return;
        bit.mesh.position.x += bit.dir.x * dt;
        bit.mesh.position.z += bit.dir.z * dt;
        bit.mesh.position.y += (bit.dir.y - 200 * t) * dt;
        bit.mesh.rotation.x += bit.spin * dt;
        bit.mesh.rotation.y += bit.spin * dt;
        bit.mesh.material.opacity = 1 - t;
      });
    }

    for (const tr of this.trails) {
      if (tr.life <= 0) continue;
      tr.life -= dt;
      if (tr.life <= 0) { tr.mesh.visible = false; continue; }
      const k = tr.life / tr.duration;
      tr.mesh.scale.set(tr.size * k, tr.size * k, tr.size * k * (tr.stretch || 1));
      tr.mesh.material.opacity = 0.78 * k;
    }

    for (const d of this.decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      if (d.life <= 0) { d.mesh.visible = false; continue; }
      d.mesh.material.opacity = 0.55 * Math.min(1, d.life / (d.duration * 0.4));
    }

    if (this.shakeTime > 0) {
      this.shakeTime -= dt;
      const power = Math.max(0, this.shakeTime) * this.shakeAmount;
      this.shakeOffset.set(
        (Math.random() - 0.5) * power, (Math.random() - 0.5) * power * 0.6,
        (Math.random() - 0.5) * power
      );
      if (this.shakeTime <= 0) { this.shakeAmount = 0; this.shakeOffset.set(0, 0, 0); }
    }
  }
}
