/**
 * The character rig — a real jointed skeleton, not a sliding picture.
 *
 * This is the whole reason the 3D build exists. In the 2D build a fighter is
 * one flat drawing that can only be nudged and squashed as a unit; here the
 * hips, shoulders, head and limbs are separate nodes, so a walk cycle is
 * actual joint rotation and reads as walking from any angle.
 *
 * Everything is procedural geometry: no model files, no rigging software, no
 * download. Silhouette variety comes from the per-character PROFILES table plus
 * the theme colours already in characters.json.
 *
 * Units are the combat core's pixels — a fighter is roughly 110 tall.
 */
import * as THREE from '../../vendor/three/three.module.min.js';

const OUTLINE_SCALE = 1.09;
const TAU = Math.PI * 2;

/**
 * Per-character build hints. Anything missing falls back to DEFAULT_PROFILE, so
 * a character added to the JSON still gets a working body — it just shares the
 * generic silhouette until it earns its own row.
 */
const DEFAULT_PROFILE = { head: 24, torso: 30, girth: 20, leg: 32, arm: 26, accessory: null };

const PROFILES = {
  char_001: { head: 25, torso: 32, girth: 20, leg: 38, arm: 30, accessory: 'ears',    // K.O. Kangaroo
              gloves: true },
  char_002: { head: 25, torso: 26, girth: 21, leg: 28, arm: 24, accessory: 'bun' },   // Grandma Grenade
  char_003: { head: 23, torso: 34, girth: 19, leg: 32, arm: 27, accessory: 'hat',     // Cactus Kid
              spikes: true },
  char_004: { head: 26, torso: 30, girth: 19, leg: 30, arm: 26, accessory: 'fin' },   // Cyber Shark
  char_005: { head: 27, torso: 28, girth: 29, leg: 26, arm: 28, accessory: 'topknot' },// Sumo Sloth
  char_006: { head: 25, torso: 27, girth: 20, leg: 30, arm: 25, accessory: 'helmet' } // Sergeant Binky
};

/** Cheap toon outline: the same geometry, grown slightly, drawn inside-out. */
function outline(mesh, material, scale = OUTLINE_SCALE) {
  const o = new THREE.Mesh(mesh.geometry, material);
  o.scale.multiplyScalar(scale);
  mesh.add(o);
  return mesh;
}

/**
 * A limb whose group origin sits at the joint, so rotating it swings the limb.
 *
 * The blob on the end is not decoration: at this camera distance a bare capsule
 * reads as part of the torso, and a hand or a foot is what makes the swing
 * legible as a swing.
 */
function limb(length, radius, material, outlineMat, endMaterial, endScale = 1.3) {
  const pivot = new THREE.Group();
  const mesh = new THREE.Mesh(
    new THREE.CapsuleGeometry(radius, Math.max(0.1, length - radius * 2), 5, 10),
    material
  );
  mesh.position.y = -length / 2;
  mesh.castShadow = true;
  outline(mesh, outlineMat, 1.16);
  pivot.add(mesh);

  const end = new THREE.Mesh(
    new THREE.SphereGeometry(radius * endScale, 10, 8), endMaterial || material
  );
  end.position.y = -length;
  end.castShadow = true;
  outline(end, outlineMat, 1.14);
  pivot.add(end);

  return pivot;
}

export class Rig {
  /**
   * @param {object} def   character definition from characters.json
   * @param {object} opts  { outlineColor }
   */
  constructor(def, opts = {}) {
    const p = { ...DEFAULT_PROFILE, ...(PROFILES[def.id] || {}) };
    this.profile = p;
    this.def = def;

    const theme = def.theme || {};
    const body = new THREE.Color(theme.body || '#9b8cff');
    const accent = new THREE.Color(theme.accent || '#ffffff');
    const trim = new THREE.Color(theme.trim || '#f0f0f0');

    this.materials = {
      body: new THREE.MeshToonMaterial({ color: body }),
      accent: new THREE.MeshToonMaterial({ color: accent }),
      trim: new THREE.MeshToonMaterial({ color: trim }),
      // Legs and feet need to separate from the torso at a glance, so they go
      // properly dark rather than a shade down.
      dark: new THREE.MeshToonMaterial({ color: body.clone().multiplyScalar(0.45) }),
      outline: new THREE.MeshBasicMaterial({
        color: opts.outlineColor || 0x1d1630, side: THREE.BackSide
      }),
      eye: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      pupil: new THREE.MeshBasicMaterial({ color: 0x1a1526 })
    };

    /* ---- hierarchy ---- */
    this.root = new THREE.Group();          // world position + facing
    this.body = new THREE.Group();          // bob / lean / squash
    this.root.add(this.body);

    this.hips = new THREE.Group();
    this.hips.position.y = p.leg;
    this.body.add(this.hips);

    // Tapered, not a capsule: wide hips narrowing to the shoulders gives the
    // arms somewhere to sit outside the silhouette instead of sinking into it.
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(p.girth * 0.82, p.girth, p.torso, 18, 1),
      this.materials.body
    );
    torso.position.y = p.torso / 2;
    torso.castShadow = true;
    outline(torso, this.materials.outline, 1.06);
    this.hips.add(torso);
    this.torso = torso;

    const shoulderCap = new THREE.Mesh(
      new THREE.SphereGeometry(p.girth * 0.82, 16, 12), this.materials.body
    );
    shoulderCap.position.y = p.torso;
    shoulderCap.scale.y = 0.7;
    shoulderCap.castShadow = true;
    outline(shoulderCap, this.materials.outline, 1.06);
    this.hips.add(shoulderCap);

    // belt / chest plate so the body is not one flat colour
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(p.girth * 0.98, p.girth * 1.0, p.torso * 0.22, 18),
      this.materials.accent
    );
    belt.position.y = p.torso * 0.16;
    this.hips.add(belt);

    this.chest = new THREE.Group();
    this.chest.position.y = p.torso;
    this.hips.add(this.chest);

    /* ---- head ---- */
    this.head = new THREE.Group();
    this.head.position.y = p.head * 0.86;
    this.chest.add(this.head);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(p.head, 20, 16), this.materials.body);
    skull.scale.set(1, 0.94, 0.96);
    skull.castShadow = true;
    outline(skull, this.materials.outline, 1.06);
    this.head.add(skull);

    // eyes — the single biggest readability win at this camera distance
    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(p.head * 0.3, 12, 10), this.materials.eye);
      eye.position.set(side * p.head * 0.36, p.head * 0.12, p.head * 0.82);
      eye.scale.set(1, 1.15, 0.55);
      this.head.add(eye);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(p.head * 0.14, 10, 8), this.materials.pupil);
      pupil.position.set(side * p.head * 0.36, p.head * 0.1, p.head * 0.95);
      pupil.scale.set(1, 1.1, 0.5);
      this.head.add(pupil);
    }

    this.addAccessory(p);

    /* ---- limbs ---- */
    const armMat = p.gloves ? this.materials.dark : this.materials.body;
    const handMat = p.gloves ? this.materials.accent : this.materials.trim;
    this.shoulderL = limb(p.arm, p.girth * 0.3, armMat, this.materials.outline, handMat, 1.5);
    this.shoulderR = limb(p.arm, p.girth * 0.3, armMat, this.materials.outline, handMat, 1.5);
    this.shoulderL.position.set(-p.girth * 0.84, -p.torso * 0.04, 0);
    this.shoulderR.position.set(p.girth * 0.84, -p.torso * 0.04, 0);
    this.chest.add(this.shoulderL, this.shoulderR);

    this.hipL = limb(p.leg, p.girth * 0.3, this.materials.dark, this.materials.outline,
                     this.materials.dark, 1.45);
    this.hipR = limb(p.leg, p.girth * 0.3, this.materials.dark, this.materials.outline,
                     this.materials.dark, 1.45);
    this.hipL.position.set(-p.girth * 0.5, 0, 0);
    this.hipR.position.set(p.girth * 0.5, 0, 0);
    this.hips.add(this.hipL, this.hipR);

    /* ---- ground ring + shadow blob ----
     * The ring is the genre's readability trick: at this camera angle a body is
     * ambiguous about where it actually stands, and the ring is not. */
    this.ring = new THREE.Mesh(
      new THREE.RingGeometry(p.girth * 1.25, p.girth * 1.65, 28),
      new THREE.MeshBasicMaterial({
        color: accent, transparent: true, opacity: 0.95,
        side: THREE.DoubleSide, depthWrite: false
      })
    );
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.position.y = 1.5;
    this.root.add(this.ring);

    /* ---- animation state ---- */
    this.phase = Math.random() * TAU;
    this.facing = 0;
    this.targetFacing = 0;
    this.leanX = 0;
    this.actionTimer = 0;
    this.actionKind = null;
    this.flashTimer = 0;
    this.flashDuration = 0;

    // Only the lit materials can flash; the outline and the eyes are flat by
    // design and lighting them up just makes the fighter look broken.
    this.litMaterials = [
      this.materials.body, this.materials.accent,
      this.materials.trim, this.materials.dark
    ];
  }

  /** White pop on taking a hit — the cheapest damage feedback there is. */
  flash(duration = 0.16) {
    this.flashTimer = duration;
    this.flashDuration = duration;
  }

  tickFlash(dt) {
    if (this.flashTimer <= 0) return;
    this.flashTimer -= dt;
    const t = Math.max(0, this.flashTimer) / this.flashDuration;
    for (const m of this.litMaterials) {
      m.emissive.setScalar(t * 0.85);
    }
  }

  addAccessory(p) {
    const M = this.materials;
    const add = (mesh, outlineIt = true) => {
      mesh.castShadow = true;
      if (outlineIt) outline(mesh, M.outline, 1.1);
      this.head.add(mesh);
      return mesh;
    };

    switch (p.accessory) {
      case 'ears': {
        for (const side of [-1, 1]) {
          const ear = new THREE.Mesh(
            new THREE.CapsuleGeometry(p.head * 0.19, p.head * 0.72, 4, 8), M.body
          );
          ear.position.set(side * p.head * 0.45, p.head * 0.95, -p.head * 0.1);
          ear.rotation.z = side * 0.28;
          add(ear);
        }
        // Headband, not a crown: put a ring near the top of the skull and from
        // this camera it reads as the rim of a pot with a head inside it.
        const band = new THREE.Mesh(
          new THREE.TorusGeometry(p.head * 0.99, p.head * 0.09, 8, 22), M.accent
        );
        band.rotation.x = Math.PI / 2;
        band.position.y = p.head * 0.34;
        band.scale.y = 0.8;
        add(band, false);
        break;
      }
      case 'fin': {
        const fin = new THREE.Mesh(new THREE.ConeGeometry(p.head * 0.4, p.head * 0.95, 4), M.accent);
        fin.position.set(0, p.head * 1.0, -p.head * 0.15);
        fin.rotation.y = Math.PI / 4;
        add(fin);
        const snout = new THREE.Mesh(new THREE.ConeGeometry(p.head * 0.45, p.head * 0.7, 10), M.body);
        snout.position.set(0, -p.head * 0.18, p.head * 0.85);
        snout.rotation.x = Math.PI / 2;
        add(snout);
        break;
      }
      case 'hat': {
        const brim = new THREE.Mesh(
          new THREE.CylinderGeometry(p.head * 1.35, p.head * 1.35, p.head * 0.1, 20), M.trim
        );
        brim.position.y = p.head * 0.78;
        add(brim);
        const crown = new THREE.Mesh(
          new THREE.CylinderGeometry(p.head * 0.72, p.head * 0.82, p.head * 0.62, 20), M.trim
        );
        crown.position.y = p.head * 1.1;
        add(crown);
        break;
      }
      case 'bun': {
        const bun = new THREE.Mesh(new THREE.SphereGeometry(p.head * 0.42, 14, 12), M.trim);
        bun.position.set(0, p.head * 0.92, -p.head * 0.35);
        add(bun);
        for (const side of [-1, 1]) {
          const lens = new THREE.Mesh(
            new THREE.TorusGeometry(p.head * 0.33, p.head * 0.07, 6, 16), M.accent
          );
          lens.position.set(side * p.head * 0.36, p.head * 0.12, p.head * 0.92);
          this.head.add(lens);
        }
        break;
      }
      case 'topknot': {
        const knot = new THREE.Mesh(new THREE.SphereGeometry(p.head * 0.3, 12, 10), M.trim);
        knot.position.y = p.head * 1.05;
        add(knot);
        for (const side of [-1, 1]) {
          const patch = new THREE.Mesh(new THREE.SphereGeometry(p.head * 0.34, 12, 10), M.dark);
          patch.position.set(side * p.head * 0.4, p.head * 0.1, p.head * 0.72);
          patch.scale.set(1, 1.2, 0.4);
          this.head.add(patch);
        }
        break;
      }
      case 'helmet': {
        const helm = new THREE.Mesh(
          new THREE.SphereGeometry(p.head * 1.08, 18, 14, 0, TAU, 0, Math.PI / 2), M.accent
        );
        helm.position.y = p.head * 0.14;
        add(helm);
        const bill = new THREE.Mesh(
          new THREE.CylinderGeometry(p.head * 0.7, p.head * 0.7, p.head * 0.1, 16, 1, false, 0, Math.PI),
          M.accent
        );
        bill.position.set(0, p.head * 0.16, p.head * 0.62);
        bill.rotation.y = Math.PI;
        add(bill, false);
        break;
      }
      default:
        break;
    }

    if (p.spikes) {
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * TAU;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(p.head * 0.09, p.head * 0.3, 5), this.materials.trim
        );
        spike.position.set(Math.cos(a) * p.head * 0.85, p.head * 0.5, Math.sin(a) * p.head * 0.85);
        spike.rotation.set(Math.sin(a) * 0.9, 0, -Math.cos(a) * 0.9);
        this.head.add(spike);
      }
    }
  }

  /** Colours the ground ring — team identity, and red-flash on damage later. */
  setRingColor(hex) { this.ring.material.color.set(hex); }

  setVisible(v) { this.root.visible = v; }

  /** Fades the whole fighter out while hidden in a bush. */
  setConcealed(hidden) {
    this.root.traverse((o) => {
      if (!o.material) return;
      if (Array.isArray(o.material)) return;
      o.material.transparent = hidden || o.material.userData.wasTransparent === true;
      o.material.opacity = hidden ? 0.35 : (o.material.userData.baseOpacity ?? 1);
    });
  }

  /**
   * Drives the whole skeleton from one number: how fast the body is moving.
   *
   * The step phase advances with distance travelled rather than with time, so
   * the feet stay planted at any speed — a cycle driven by the clock slides
   * whenever the character speeds up or slows down, which is exactly the
   * "gliding" the 2D build could never shake.
   */
  update(dt, { speed = 0, maxSpeed = 190, moveAngle = null, aimAngle = null } = {}) {
    this.tickFlash(dt);

    const p = this.profile;
    const ratio = maxSpeed > 0 ? Math.min(1, speed / maxSpeed) : 0;
    const stride = p.leg * 2.6;                       // world units per half-step
    this.phase = (this.phase + (speed / stride) * dt * Math.PI) % TAU;

    // --- facing: turn toward where you look, or where you go ---
    const want = aimAngle != null ? aimAngle : (moveAngle != null ? moveAngle : this.targetFacing);
    this.targetFacing = want;
    // three.js yaw is measured the other way round from the combat core's atan2
    const yaw = -this.targetFacing + Math.PI / 2;
    let delta = yaw - this.facing;
    while (delta > Math.PI) delta -= TAU;
    while (delta < -Math.PI) delta += TAU;
    this.facing += delta * Math.min(1, dt * 14);
    this.root.rotation.y = this.facing;

    if (this.actionTimer > 0) {
      this.actionTimer = Math.max(0, this.actionTimer - dt);
      this.poseAction(ratio);
      return;
    }

    const s = Math.sin(this.phase);
    const c = Math.cos(this.phase);

    if (ratio > 0.02) {
      /* ---- walk ---- */
      // Positive rotation.z swings a limb toward +X, so the left side takes the
      // negative angle to splay outwards rather than fold into the torso.
      const swing = 0.95 * ratio;
      this.hipL.rotation.x = s * swing;
      this.hipR.rotation.x = -s * swing;
      this.hipL.rotation.z = -0.07;
      this.hipR.rotation.z = 0.07;

      this.shoulderL.rotation.x = -s * swing * 0.8;
      this.shoulderR.rotation.x = s * swing * 0.8;
      this.shoulderL.rotation.z = -0.3 - Math.abs(s) * 0.1;
      this.shoulderR.rotation.z = 0.3 + Math.abs(s) * 0.1;

      // one bounce per footfall, so twice per cycle
      const bob = Math.abs(s);
      this.body.position.y = bob * p.leg * 0.14;
      this.body.rotation.x = -0.13 * ratio;                 // lean into the run
      this.body.rotation.z = c * 0.05 * ratio;              // hip sway
      const squash = 1 - (1 - bob) * 0.06 * ratio;
      this.body.scale.set(2 - squash, squash, 2 - squash);

      this.head.rotation.x = 0.1 * ratio - bob * 0.06;
      this.head.rotation.z = -c * 0.06 * ratio;
    } else {
      /* ---- idle: breathe, do not freeze ---- */
      const b = Math.sin(performance.now() / 620);
      this.hipL.rotation.x = this.hipR.rotation.x = 0;
      this.hipL.rotation.z = -0.06;
      this.hipR.rotation.z = 0.06;
      this.shoulderL.rotation.x = this.shoulderR.rotation.x = b * 0.06;
      this.shoulderL.rotation.z = -0.28 - b * 0.04;
      this.shoulderR.rotation.z = 0.28 + b * 0.04;
      this.body.position.y = b * 1.6;
      this.body.rotation.set(0, 0, 0);
      const br = 1 + b * 0.015;
      this.body.scale.set(1 / br, br, 1 / br);
      this.head.rotation.set(-b * 0.03, 0, 0);
    }
  }

  /** Held pose for a one-shot action (wired up in the combat step). */
  poseAction(ratio) {
    const t = this.actionTimer;
    switch (this.actionKind) {
      case 'attack': {
        const punch = Math.sin(Math.min(1, (0.26 - t) / 0.26) * Math.PI);
        this.shoulderR.rotation.x = -1.9 * punch;
        this.shoulderR.rotation.z = -0.1;
        this.shoulderL.rotation.x = 0.5 * punch;
        this.body.rotation.y = -0.35 * punch;
        this.body.rotation.x = -0.1 * punch;
        break;
      }
      case 'cast': {
        const u = Math.sin(Math.min(1, (0.45 - t) / 0.45) * Math.PI);
        this.shoulderL.rotation.x = -2.4 * u;
        this.shoulderR.rotation.x = -2.4 * u;
        this.body.rotation.x = 0.3 * u;
        this.body.position.y = u * 14;
        this.hipL.rotation.x = -0.5 * u;
        this.hipR.rotation.x = -0.5 * u;
        break;
      }
      case 'hurt': {
        const u = Math.min(1, this.actionTimer / 0.18);
        this.body.rotation.x = 0.35 * u;
        this.head.rotation.x = 0.4 * u;
        break;
      }
      default:
        break;
    }
  }

  play(kind, duration) {
    this.actionKind = kind;
    this.actionTimer = duration;
  }

  /** Places the rig from the combat core's (x, y) pair. */
  setPosition(x, y) {
    this.root.position.set(x, 0, y);
  }

  dispose() {
    this.root.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
    });
    Object.values(this.materials).forEach((m) => m.dispose());
  }
}

export { PROFILES };
