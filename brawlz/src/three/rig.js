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
const DEFAULT_PROFILE = {
  head: 24, torso: 30, girth: 20, leg: 32, arm: 26, accessory: null,
  /** A face, not a ball with eyes stuck on. See buildFace(). */
  muzzle: 0, nose: null, teeth: false, brow: null, belly: 0, tail: 0
};

const PROFILES = {
  // K.O. Kangaroo — long snout, cream belly, heavy tail, angry brow.
  char_001: { head: 25, torso: 32, girth: 20, leg: 38, arm: 30, accessory: 'ears',
              gloves: true, muzzle: 0.62, nose: 0x2a1a18, brow: 'angry',
              belly: 0.8, tail: 1.15 },
  // Grandma Grenade — small kind muzzle, soft brow.
  char_002: { head: 25, torso: 26, girth: 21, leg: 28, arm: 24, accessory: 'bun',
              muzzle: 0.34, nose: 0xd88fa8, brow: 'soft', belly: 0.55 },
  // Cactus Kid — no snout on a plant; spikes and a hard scowl instead.
  char_003: { head: 23, torso: 34, girth: 19, leg: 32, arm: 27, accessory: 'hat',
              spikes: true, brow: 'angry', bodySpikes: true },
  // Cyber Shark — long pointed snout with teeth.
  char_004: { head: 26, torso: 30, girth: 19, leg: 30, arm: 26, accessory: 'fin',
              muzzle: 0.9, teeth: true, brow: 'angry', belly: 0.7 },
  // Sumo Sloth — huge pale belly, blunt muzzle, heavy sleepy lids.
  char_005: { head: 27, torso: 28, girth: 29, leg: 26, arm: 28, accessory: 'topknot',
              muzzle: 0.5, nose: 0x2b211c, brow: 'sleepy', belly: 1.15 },
  // Sergeant Binky — no snout, just a permanent scowl.
  char_006: { head: 25, torso: 27, girth: 20, leg: 30, arm: 25, accessory: 'helmet',
              brow: 'angry', belly: 0.45 }
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
      // A belly is the body colour lifted, never the trim: trim is whatever the
      // character's palette put there and on half the roster it is nearly black,
      // which paints a dark slab across the chest.
      belly: new THREE.MeshToonMaterial({
        color: body.clone().lerp(new THREE.Color(0xffffff), 0.55)
      }),
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

    this.buildFace(p);
    this.addAccessory(p);

    /* ---- limbs ---- */
    const armMat = p.gloves ? this.materials.dark : this.materials.body;
    const handMat = p.gloves ? this.materials.accent : this.materials.trim;
    this.shoulderL = limb(p.arm, p.girth * 0.3, armMat, this.materials.outline, handMat, 1.5);
    this.shoulderR = limb(p.arm, p.girth * 0.3, armMat, this.materials.outline, handMat, 1.5);
    this.shoulderL.position.set(-p.girth * 0.84, -p.torso * 0.04, 0);
    this.shoulderR.position.set(p.girth * 0.84, -p.torso * 0.04, 0);
    this.chest.add(this.shoulderL, this.shoulderR);

    // Legs are two-bone IK chains, not swinging sticks. See buildLeg().
    this.legs = [this.buildLeg(-1, p), this.buildLeg(1, p)];
    // Kept as names so the action poses and the test harness can still reach
    // the hip joints directly.
    this.hipL = this.legs[0].hip;
    this.hipR = this.legs[1].hip;

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

    /* ---- contact shadow ----
     * The sun already casts a real shadow, but it lands off to one side. What
     * says "this body is touching the floor" is a dark patch directly beneath
     * it, tightening as the body drops. Without it a walk cycle reads as a
     * hover no matter how correct the legs are. */
    this.contact = new THREE.Mesh(
      new THREE.CircleGeometry(p.girth * 1.15, 20),
      new THREE.MeshBasicMaterial({
        color: 0x000000, transparent: true, opacity: 0.34, depthWrite: false
      })
    );
    this.contact.rotation.x = -Math.PI / 2;
    this.contact.position.y = 1.2;
    this.root.add(this.contact);

    /* ---- animation state ---- */
    this.phase = Math.random() * TAU;
    this.facing = 0;
    this.targetFacing = 0;
    this.leanX = 0;
    this.actionTimer = 0;
    this.actionKind = null;
    this.flashTimer = 0;
    this.flashDuration = 0;
    /** Eases the gait in and out so a stopped fighter settles onto both feet. */
    this.gait = 0;
    this.bob = 0;
    /** Called with (rig, side) the frame a foot lands. */
    this.onFootstep = null;

    // Only the lit materials can flash; the outline and the eyes are flat by
    // design and lighting them up just makes the fighter look broken.
    this.litMaterials = [
      this.materials.body, this.materials.accent,
      this.materials.trim, this.materials.dark, this.materials.belly
    ];
  }

  /**
   * The parts that make a head a face.
   *
   * A sphere with two eyes reads as a bead. What separates the kangaroo from
   * the sloth at a glance is the profile — how far the snout sticks out, what
   * the brow is doing, how much belly there is. All of it is a few primitives,
   * and all of it is driven by the per-character profile.
   */
  buildFace(p) {
    const M = this.materials;
    const H = p.head;

    if (p.muzzle) {
      const len = H * p.muzzle;
      const snout = new THREE.Mesh(
        new THREE.SphereGeometry(H * 0.44, 14, 12), M.body
      );
      snout.scale.set(0.86, 0.74, 0.55 + p.muzzle * 1.5);
      snout.position.set(0, -H * 0.22, H * 0.62 + len * 0.35);
      snout.castShadow = true;
      outline(snout, M.outline, 1.09);
      this.head.add(snout);

      if (p.nose) {
        const nose = new THREE.Mesh(
          new THREE.SphereGeometry(H * 0.15, 10, 8),
          new THREE.MeshToonMaterial({ color: p.nose })
        );
        nose.position.set(0, -H * 0.14, H * 0.62 + len * 0.95);
        nose.scale.set(1.2, 0.9, 0.8);
        this.head.add(nose);
      }

      if (p.teeth) {
        // Two rows, top and bottom — a shark reads by its teeth before
        // anything else about it registers.
        for (const dir of [1, -1]) {
          for (let i = -2; i <= 2; i++) {
            const tooth = new THREE.Mesh(
              new THREE.ConeGeometry(H * 0.055, H * 0.16, 4), M.trim
            );
            tooth.position.set(i * H * 0.11, -H * 0.24 + dir * H * 0.07,
                               H * 0.6 + len * 0.72);
            tooth.rotation.x = dir > 0 ? Math.PI : 0;
            this.head.add(tooth);
          }
        }
      }
    }

    if (p.brow) {
      // The brow does all the acting. Angle it down toward the nose for anger,
      // up and out for kindness, and drop it flat and low for sleepy.
      const tilt = { angry: -0.55, soft: 0.4, sleepy: -0.08 }[p.brow] || 0;
      const drop = { angry: 0.34, soft: 0.42, sleepy: 0.16 }[p.brow] || 0.35;
      for (const side of [-1, 1]) {
        const brow = new THREE.Mesh(
          new THREE.BoxGeometry(H * 0.4, H * 0.11, H * 0.12), M.dark
        );
        // Pushed out to the skull's surface at this height. The sphere is
        // narrower the higher you go, so a fixed depth buries the brow.
        const yNorm = drop / 0.94;
        const surface = Math.sqrt(Math.max(0, 1 - yNorm * yNorm)) * 0.96;
        brow.position.set(side * H * 0.36, H * drop, H * surface * 0.97);
        brow.rotation.z = side * tilt;
        this.head.add(brow);
      }
    }

    if (p.belly) {
      const belly = new THREE.Mesh(
        new THREE.SphereGeometry(p.girth * 0.78, 16, 12), M.belly
      );
      belly.scale.set(0.92 * p.belly, 0.9, 0.62);
      belly.position.set(0, p.torso * 0.42, p.girth * 0.5);
      this.hips.add(belly);
    }

    if (p.tail) {
      const tail = new THREE.Mesh(
        new THREE.CapsuleGeometry(p.girth * 0.3, p.girth * p.tail, 5, 10), M.body
      );
      tail.position.set(0, -p.girth * 0.1, -p.girth * (0.5 + p.tail * 0.35));
      tail.rotation.x = Math.PI / 2.35;
      tail.castShadow = true;
      outline(tail, M.outline, 1.1);
      this.hips.add(tail);
      this.tail = tail;
    }

    if (p.bodySpikes) {
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * TAU;
        const spike = new THREE.Mesh(
          new THREE.ConeGeometry(p.girth * 0.1, p.girth * 0.42, 5), M.trim
        );
        spike.position.set(Math.cos(a) * p.girth * 0.92, p.torso * (0.3 + (i % 3) * 0.22),
                           Math.sin(a) * p.girth * 0.92);
        spike.rotation.set(Math.sin(a) * 1.4, 0, -Math.cos(a) * 1.4);
        this.hips.add(spike);
      }
    }
  }

  /**
   * One leg as a two-bone chain: hip → knee → foot.
   *
   * The whole point of the extra joint is that the foot can be *placed* rather
   * than swung. A single rotating stick can only ever describe an arc through
   * the air; with a knee, the foot can be told to stay at a fixed spot on the
   * ground while the body moves over it — which is what walking is.
   */
  buildLeg(side, p) {
    const M = this.materials;
    const thigh = p.leg * 0.55;
    const shin = p.leg * 0.55;
    const r = p.girth * 0.28;

    const hip = new THREE.Group();
    hip.position.set(side * p.girth * 0.5, 0, 0);
    this.hips.add(hip);

    const thighMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(r, Math.max(0.1, thigh - r * 2), 4, 8), M.dark
    );
    thighMesh.position.y = -thigh / 2;
    thighMesh.castShadow = true;
    outline(thighMesh, M.outline, 1.16);
    hip.add(thighMesh);

    const knee = new THREE.Group();
    knee.position.y = -thigh;
    hip.add(knee);

    const shinMesh = new THREE.Mesh(
      new THREE.CapsuleGeometry(r * 0.92, Math.max(0.1, shin - r * 1.84), 4, 8), M.dark
    );
    shinMesh.position.y = -shin / 2;
    shinMesh.castShadow = true;
    outline(shinMesh, M.outline, 1.16);
    knee.add(shinMesh);

    // A foot, not a ball: something with a front and a back reads as planted.
    // The contact point, as an empty. The foot mesh hangs off the ankle and
    // swings with the knee, so it is the wrong thing to plant, to measure, or
    // to kick dust from.
    const ankle = new THREE.Group();
    ankle.position.y = -shin;
    knee.add(ankle);

    const foot = new THREE.Mesh(
      new THREE.BoxGeometry(r * 2.1, r * 1.15, r * 3.1), M.dark
    );
    foot.position.set(0, r * 0.4, r * 0.55);
    foot.castShadow = true;
    outline(foot, M.outline, 1.12);
    ankle.add(foot);

    return {
      side, hip, knee, ankle, foot, thigh, shin,
      // Half a cycle apart, so one foot is always down.
      phaseOffset: side < 0 ? 0 : Math.PI,
      grounded: true
    };
  }

  /**
   * Places a foot at (y, z) relative to its hip and solves the knee for it.
   *
   * Law of cosines twice: once for how far the thigh must swing off the
   * hip-to-foot line, once for how far the knee must bend. Clamping the reach
   * just short of full extension keeps the acos arguments inside their domain —
   * a target further away than the leg is long is not an error, it just means
   * the leg is straight.
   */
  solveLeg(leg, targetY, targetZ, lean = 0, scaleY = 1, scaleZ = 1) {
    // Undo the body's pitch, then its squash, so the target given on the world
    // ground plane arrives correct in the hip's own frame.
    const cosL = Math.cos(lean);
    const sinL = Math.sin(lean);
    const ry = targetY * cosL + targetZ * sinL;
    const rz = -targetY * sinL + targetZ * cosL;
    targetY = ry / scaleY;
    targetZ = rz / scaleZ;

    const reach = leg.thigh + leg.shin;
    const d = Math.min(Math.hypot(targetY, targetZ), reach - 0.01);
    if (d < 1e-4) return;

    // Angle of the hip-to-foot line, measured from straight down. Positive
    // rotation about X swings a limb toward -Z, so forward targets need a
    // negative angle.
    const toTarget = Math.atan2(-targetZ, -targetY);

    const cosAlpha = (leg.thigh * leg.thigh + d * d - leg.shin * leg.shin) / (2 * leg.thigh * d);
    const cosBeta = (leg.thigh * leg.thigh + leg.shin * leg.shin - d * d) / (2 * leg.thigh * leg.shin);
    const alpha = Math.acos(Math.min(1, Math.max(-1, cosAlpha)));
    const beta = Math.acos(Math.min(1, Math.max(-1, cosBeta)));

    // Thigh ahead of the line, shin folding back behind it: the knee points
    // forward, the way a leg bends.
    leg.hip.rotation.x = toTarget - alpha;
    leg.knee.rotation.x = Math.PI - beta;
    // Counter-rotate the foot so the sole stays parallel to the floor. A foot
    // that points wherever the shin happens to point reads as a hoof.
    leg.foot.rotation.x = -(leg.hip.rotation.x + leg.knee.rotation.x + lean);
  }

  /**
   * The gait.
   *
   * Each leg spends 60% of the cycle in stance and 40% in swing. During stance
   * the foot target slides straight backwards through the hip's local space at
   * exactly the rate the body moves forward, so in world space the foot does
   * not move at all. That single fact is the difference between walking and
   * gliding, and it is why the phase is driven by distance travelled rather
   * than by the clock.
   */
  updateLegs(dt, ratio) {
    const p = this.profile;
    const cycleDistance = p.leg * 2.2;         // travelled per full cycle
    const sweep = cycleDistance * 0.6;         // stance carries the body this far
    const lift = p.leg * 0.34;
    const groundY = -(p.leg + this.bob);

    // The hips ride inside a group that leans forward and squashes vertically.
    // Both have to be undone on the way in, or the "ground" the feet reach for
    // is a tilted, stretched plane rather than the real one.
    const lean = this.body.rotation.x;
    const sy = this.body.scale.y || 1;
    const sz = this.body.scale.z || 1;

    // Ease the gait in and out; a fighter that stops mid-swing with one leg in
    // the air looks broken, and snapping the legs straight looks worse.
    const want = ratio > 0.04 ? 1 : 0;
    this.gait += (want - this.gait) * Math.min(1, dt * 9);

    for (const leg of this.legs) {
      const t = (((this.phase + leg.phaseOffset) % TAU) + TAU) % TAU / TAU;
      let z, y, grounded;

      if (t < 0.6) {
        const u = t / 0.6;
        z = sweep * (0.5 - u);
        y = 0;
        grounded = true;
      } else {
        const u = (t - 0.6) / 0.4;
        z = sweep * (u - 0.5);
        y = Math.sin(Math.PI * u) * lift;
        grounded = false;
      }

      this.solveLeg(leg, groundY + y * this.gait, z * this.gait, lean, sy, sz);

      if (grounded && !leg.grounded && this.gait > 0.35 && this.onFootstep) {
        this.onFootstep(this, leg.side);
      }
      leg.grounded = grounded;
    }
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
    // One full cycle per this much ground covered. Driving the phase from
    // distance rather than time is what keeps a planted foot planted when the
    // fighter speeds up or slows down.
    const cycleDistance = p.leg * 2.2;
    // Converted to the rig's own units first. The rig is drawn scaled up, so a
    // world speed measured against a local stride makes every cycle cover more
    // ground than the feet were told to sweep — which is a glide.
    const localSpeed = speed / (this.root.scale.x || 1);
    this.phase = (this.phase + (TAU * localSpeed * dt) / cycleDistance) % TAU;

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
    const breathe = Math.sin(performance.now() / 620);

    /* ---- body ----
     * Two dips per cycle, at the two double-support moments. Small: the body
     * rides *on* the legs, and a torso that lifts more than an inch or two off
     * a planted foot is the thing that reads as floating. */
    const dip = (0.5 - 0.5 * Math.cos(this.phase * 2));
    this.bob = ratio > 0.04
      ? dip * p.leg * 0.055
      : breathe * 1.4;

    this.body.position.y = this.bob;
    this.body.rotation.x = -0.11 * ratio;                   // lean into the run
    this.body.rotation.z = c * 0.045 * ratio;               // hip sway
    const squash = 1 - (1 - dip) * 0.045 * ratio + (ratio > 0.04 ? 0 : breathe * 0.012);
    this.body.scale.set(2 - squash, squash, 2 - squash);

    /* ---- legs: placed on the ground, not swung through the air ---- */
    this.updateLegs(dt, ratio);

    /* ---- arms counter-swing the legs ---- */
    const swing = 0.85 * ratio;
    this.shoulderL.rotation.x = -s * swing + (1 - ratio) * breathe * 0.06;
    this.shoulderR.rotation.x = s * swing + (1 - ratio) * breathe * 0.06;
    this.shoulderL.rotation.z = -0.28 - Math.abs(s) * 0.1 * ratio;
    this.shoulderR.rotation.z = 0.28 + Math.abs(s) * 0.1 * ratio;

    this.head.rotation.x = 0.09 * ratio - dip * 0.05 * ratio - (1 - ratio) * breathe * 0.03;
    this.head.rotation.z = -c * 0.05 * ratio;

    /* ---- contact shadow tightens as the body settles ---- */
    const drop = 1 - Math.min(1, this.bob / (p.leg * 0.06));
    this.contact.scale.setScalar(0.82 + drop * 0.22);
    this.contact.material.opacity = 0.2 + drop * 0.16;
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
        // Tuck the legs by pulling the whole body up off them; the IK solver
        // owns the hip angles now and would overwrite anything set here.
        this.legs.forEach((leg) => { leg.knee.rotation.x += 0.6 * u; });
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
