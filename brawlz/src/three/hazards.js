/**
 * Hazards — the visible half.
 *
 * Subscribes to HazardDirector events and draws them. It decides what a meteor
 * looks like; it never decides when one falls. Keeping the split that strict is
 * what lets a new hazard be added as data plus one visual, without touching the
 * rules.
 */
import * as THREE from '../../vendor/three/three.module.min.js';

const SKY = 1500;   // how high things start their fall

export class HazardView {
  constructor(scene, fx) {
    this.scene = scene;
    this.fx = fx;
    this.meteors = new Map();
    this.drops = new Map();
    this.padMeshes = [];
    this.time = 0;

    this.group = new THREE.Group();
    scene.add(this.group);

    this.rockGeo = new THREE.IcosahedronGeometry(1, 1);
    this.markerGeo = new THREE.RingGeometry(0.86, 1, 32);
    this.crateGeo = new THREE.BoxGeometry(1, 1, 1);
    this.padGeo = new THREE.CircleGeometry(1, 28);
  }

  /** Wire this view to a director. */
  attach(director) {
    director.onEvent = (name, payload) => this.handle(name, payload);
  }

  handle(name, payload) {
    switch (name) {
      case 'meteor-telegraph': return this.meteorTelegraph(payload);
      case 'meteor-impact': return this.meteorImpact(payload);
      case 'drop-start': return this.dropStart(payload);
      case 'drop-land': return this.dropLand(payload);
      case 'drop-collect': return this.dropCollect(payload);
      case 'pads': return this.buildPads(payload.pads);
      default: return undefined;
    }
  }

  /* ---------------- meteors ---------------- */

  meteorTelegraph(m) {
    // The marker on the ground is the actual game mechanic — the rock is set
    // dressing. It goes down first and stays readable the whole way.
    const marker = new THREE.Mesh(this.markerGeo, new THREE.MeshBasicMaterial({
      color: 0xff5a3c, transparent: true, opacity: 0.9,
      side: THREE.DoubleSide, depthWrite: false
    }));
    marker.rotation.x = -Math.PI / 2;
    marker.position.set(m.x, 4, m.y);
    marker.scale.setScalar(m.radius);

    const inner = new THREE.Mesh(new THREE.CircleGeometry(1, 28), new THREE.MeshBasicMaterial({
      color: 0xff2d1a, transparent: true, opacity: 0.3, depthWrite: false
    }));
    inner.rotation.x = -Math.PI / 2;
    inner.position.set(m.x, 3, m.y);
    inner.scale.setScalar(m.radius);

    const rock = new THREE.Mesh(this.rockGeo, new THREE.MeshToonMaterial({
      color: 0x3a2018, emissive: 0xff4400, emissiveIntensity: 0.55
    }));
    rock.position.set(m.x, SKY, m.y);
    rock.scale.setScalar(m.radius * 0.42);
    rock.castShadow = true;

    this.group.add(marker, inner, rock);
    this.meteors.set(m.id, { m, marker, inner, rock, elapsed: 0 });
  }

  meteorImpact(m) {
    const entry = this.meteors.get(m.id);
    if (entry) {
      this.group.remove(entry.marker, entry.inner, entry.rock);
      entry.marker.material.dispose();
      entry.inner.material.dispose();
      entry.rock.material.dispose();
      this.meteors.delete(m.id);
    }
    this.fx.shockwave(m.x, m.y, m.radius * 1.25, 0xff6a2c, 0.55);
    this.fx.sparkBurst(m.x, m.y, 0xff8a3c, 7, 130);
    this.fx.scorch(m.x, m.y, m.radius * 0.8, 8);
    this.fx.shake(0.4, 30);
  }

  /* ---------------- supply drops ---------------- */

  dropStart(d) {
    const crate = new THREE.Mesh(this.crateGeo, new THREE.MeshToonMaterial({ color: 0xffc14e }));
    crate.scale.setScalar(d.def.radius * 0.95);
    crate.position.set(d.x, SKY, d.y);
    crate.castShadow = true;

    // Unit-sized on purpose: the band is a child of a crate that is already
    // scaled up by its radius, so anything sized in world units here gets
    // multiplied by that scale a second time.
    const band = new THREE.Mesh(
      new THREE.BoxGeometry(1.04, 0.28, 1.04),
      new THREE.MeshToonMaterial({ color: 0x3ce0e0 })
    );
    crate.add(band);

    // A chute so the crate reads as arriving rather than as falling debris.
    const chute = new THREE.Mesh(
      new THREE.SphereGeometry(d.def.radius * 1.5, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      new THREE.MeshToonMaterial({ color: 0xff7ad9, side: THREE.DoubleSide })
    );
    chute.position.set(d.x, SKY + d.def.radius * 1.7, d.y);

    const shadow = new THREE.Mesh(new THREE.CircleGeometry(1, 24), new THREE.MeshBasicMaterial({
      color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false
    }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(d.x, 3.5, d.y);
    shadow.scale.setScalar(d.def.radius);

    this.group.add(crate, chute, shadow);
    this.drops.set(d.id, { d, crate, chute, shadow, landed: false, bob: 0 });
  }

  dropLand(d) {
    const entry = this.drops.get(d.id);
    if (!entry) return;
    entry.landed = true;
    this.group.remove(entry.chute);
    entry.chute.material.dispose();
    entry.crate.position.y = d.def.radius * 0.5;
    this.fx.shockwave(d.x, d.y, d.def.radius * 1.6, 0x3ce0e0, 0.4);
    this.fx.shake(0.15, 8);
  }

  dropCollect({ drop }) {
    const entry = this.drops.get(drop.id);
    if (!entry) return;
    this.group.remove(entry.crate, entry.shadow);
    entry.crate.material.dispose();
    entry.shadow.material.dispose();
    this.drops.delete(drop.id);
    this.fx.shockwave(drop.x, drop.y, drop.def.radius * 2.4, 0xffd166, 0.5);
    this.fx.sparkBurst(drop.x, drop.y, 0x3ce0e0, 7, 90);
  }

  /* ---------------- energy pads ---------------- */

  buildPads(pads) {
    pads.forEach((pad) => {
      const mesh = new THREE.Mesh(this.padGeo, new THREE.MeshBasicMaterial({
        color: 0x8affe0, transparent: true, opacity: 0.5, depthWrite: false
      }));
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(pad.x, 3, pad.y);
      mesh.scale.setScalar(38);
      this.group.add(mesh);

      const ring = new THREE.Mesh(this.markerGeo, new THREE.MeshBasicMaterial({
        color: 0x8affe0, transparent: true, opacity: 0.85,
        side: THREE.DoubleSide, depthWrite: false
      }));
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(pad.x, 3.5, pad.y);
      ring.scale.setScalar(44);
      this.group.add(ring);

      this.padMeshes.push({ mesh, ring, phase: Math.random() * Math.PI * 2 });
    });
  }

  /* ------------------------------------------------------------------ */

  update(dt) {
    this.time += dt;

    for (const entry of this.meteors.values()) {
      const { m, rock, marker, inner } = entry;
      entry.elapsed += dt;
      const t = Math.min(1, entry.elapsed / m.warning);
      // Accelerate: a rock that descends at a constant rate looks like a lift.
      rock.position.y = SKY * (1 - t * t) + m.radius * 0.4;
      rock.rotation.x += dt * 3.4;
      rock.rotation.z += dt * 2.1;

      // The marker pulses faster as the impact nears — the countdown you feel
      // instead of read.
      const pulse = Math.sin(entry.elapsed * (6 + t * 22));
      marker.scale.setScalar(m.radius * (1 + pulse * 0.05));
      marker.material.opacity = 0.55 + 0.45 * (0.5 + pulse * 0.5);
      inner.material.opacity = 0.15 + 0.3 * t;
    }

    for (const entry of this.drops.values()) {
      const { d, crate, chute, shadow } = entry;
      if (!entry.landed) {
        const t = 1 - Math.max(0, d.falling) / d.def.fall;
        crate.position.y = SKY * (1 - t) + d.def.radius * 0.5;
        crate.rotation.y += dt * 0.8;
        chute.position.y = crate.position.y + d.def.radius * 1.7;
        shadow.scale.setScalar(d.def.radius * (0.4 + t * 0.7));
        shadow.material.opacity = 0.1 + t * 0.3;
      } else {
        entry.bob += dt;
        crate.position.y = d.def.radius * 0.5 + Math.sin(entry.bob * 3) * 3;
        crate.rotation.y += dt * 1.2;
      }
    }

    for (const pad of this.padMeshes) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 2.4 + pad.phase);
      pad.mesh.material.opacity = 0.25 + pulse * 0.3;
      pad.ring.scale.setScalar(42 + pulse * 6);
    }
  }

  dispose() {
    this.scene.remove(this.group);
    this.group.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material) o.material.dispose();
    });
  }
}
