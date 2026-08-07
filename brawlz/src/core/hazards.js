/**
 * Arena hazards — the rules half.
 *
 * An arena in this game is not just a shape. What separates one arena from
 * another is what the arena *does* to you while you fight in it: meteors that
 * come down on a timer, crates that drop from the sky and are worth fighting
 * over, pads that charge your super if you are brave enough to stand on them.
 *
 * All of that lives here as pure logic — timers, positions, damage — and is
 * driven entirely by data in arenas.json. The renderer subscribes to the events
 * and decides what a meteor looks like; it never decides when one falls.
 *
 * No engine import on purpose: this is the layer that would survive a port.
 */

/**
 * A telegraphed hazard has to be survivable. Every damaging hazard here shows
 * a marker on the ground first and only then hits, so dying to one is a
 * decision you made rather than something the arena did to you.
 */
export const HAZARD_DEFAULTS = {
  meteor_rain: {
    first: 8, interval: 7, warning: 1.5, count: 1, damage: 900,
    radius: 130, knockback: 420
  },
  supply_drop: {
    first: 14, interval: 20, fall: 2.2, radius: 46, heal: 0.3, superCharge: 1
  },
  energy_pad: {
    chargePerSecond: 0.13, tiles: []
  }
};

let nextId = 1;

export class HazardDirector {
  /**
   * @param {object} system  the CombatSystem (for damage and actor positions)
   * @param {object} grid    anything with isOpenTile / centreOf / cols / height / tile
   * @param {Array}  defs    hazard definitions from the arena data
   * @param {object} opts    { onEvent(name, payload), random }
   */
  constructor(system, grid, defs, opts = {}) {
    this.system = system;
    this.grid = grid;
    this.onEvent = opts.onEvent || (() => {});
    this.random = opts.random || Math.random;

    this.time = 0;
    this.pending = [];        // telegraphed meteors waiting to land
    this.drops = [];          // crates falling or sitting on the ground
    this.pads = [];

    this.timers = (defs || []).map((raw) => {
      const def = { ...(HAZARD_DEFAULTS[raw.type] || {}), ...raw };
      if (def.type === 'energy_pad') {
        (def.tiles || []).forEach(([col, row]) => {
          const p = grid.centreOf(col, row);
          this.pads.push({ id: nextId++, x: p.x, y: p.y, def });
        });
        this.onEvent('pads', { pads: this.pads.slice() });
        return null;
      }
      return { def, next: def.first };
    }).filter(Boolean);
  }

  /** A random open tile, optionally kept away from a point. */
  pickOpenPoint(minDistFrom = null, minDist = 0, tries = 24) {
    const g = this.grid;
    for (let i = 0; i < tries; i++) {
      const col = Math.floor(this.random() * g.cols);
      const row = Math.floor(this.random() * g.height);
      if (!g.isOpenTile(col, row)) continue;
      const p = g.centreOf(col, row);
      if (minDistFrom && Math.hypot(p.x - minDistFrom.x, p.y - minDistFrom.y) < minDist) continue;
      return p;
    }
    return null;
  }

  /** Live actors, used to aim hazards at the fight rather than at empty floor. */
  livingActors() {
    return this.system.actors.filter((a) => a.alive);
  }

  update(dt) {
    this.time += dt;
    this.tickSchedules(dt);
    this.tickMeteors(dt);
    this.tickDrops(dt);
    this.tickPads(dt);
  }

  tickSchedules(dt) {
    for (const t of this.timers) {
      t.next -= dt;
      if (t.next > 0) continue;
      t.next = t.def.interval;
      if (t.def.type === 'meteor_rain') this.callMeteors(t.def);
      else if (t.def.type === 'supply_drop') this.callDrop(t.def);
    }
  }

  /* ---------------- meteors ---------------- */

  callMeteors(def) {
    const actors = this.livingActors();
    for (let i = 0; i < (def.count || 1); i++) {
      let point = null;
      // Half the meteors are aimed near somebody and half are pure chaos. All
      // aimed is oppressive; all random is scenery.
      if (actors.length && this.random() < 0.5) {
        const target = actors[Math.floor(this.random() * actors.length)];
        const spread = (def.radius || 130) * 1.6;
        const cand = {
          x: target.x + (this.random() - 0.5) * spread * 2,
          y: target.y + (this.random() - 0.5) * spread * 2
        };
        const tile = this.grid.tileOf(cand.x, cand.y);
        if (this.grid.isOpenTile(tile.col, tile.row)) point = cand;
      }
      if (!point) point = this.pickOpenPoint();
      if (!point) continue;

      const meteor = {
        id: nextId++, x: point.x, y: point.y, def,
        remaining: def.warning, warning: def.warning, radius: def.radius
      };
      this.pending.push(meteor);
      this.onEvent('meteor-telegraph', meteor);
    }
  }

  tickMeteors(dt) {
    for (let i = this.pending.length - 1; i >= 0; i--) {
      const m = this.pending[i];
      m.remaining -= dt;
      if (m.remaining > 0) continue;
      this.pending.splice(i, 1);

      // No source actor: an arena hazard is nobody's kill and charges nobody's
      // super. Passing a source here would quietly hand free super to whoever
      // happened to spawn first.
      this.system.resolveAoe(null, m.x, m.y, m.radius, m.def.damage, {
        knockback: m.def.knockback, source: 'hazard'
      });
      this.onEvent('meteor-impact', m);
    }
  }

  /* ---------------- supply drops ---------------- */

  callDrop(def) {
    const point = this.pickOpenPoint();
    if (!point) return;
    const drop = {
      id: nextId++, x: point.x, y: point.y, def,
      falling: def.fall, landed: false
    };
    this.drops.push(drop);
    this.onEvent('drop-start', drop);
  }

  tickDrops(dt) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i];
      if (!d.landed) {
        d.falling -= dt;
        if (d.falling <= 0) {
          d.landed = true;
          this.onEvent('drop-land', d);
        }
        continue;
      }

      for (const actor of this.livingActors()) {
        if (Math.hypot(actor.x - d.x, actor.y - d.y) > d.def.radius) continue;
        actor.hp = Math.min(actor.maxHp, actor.hp + actor.maxHp * d.def.heal);
        actor.superCharge = Math.min(1, actor.superCharge + d.def.superCharge);
        this.drops.splice(i, 1);
        this.onEvent('drop-collect', { drop: d, actor });
        break;
      }
    }
  }

  /* ---------------- energy pads ---------------- */

  tickPads(dt) {
    if (!this.pads.length) return;
    for (const actor of this.livingActors()) {
      for (const pad of this.pads) {
        if (Math.hypot(actor.x - pad.x, actor.y - pad.y) > this.grid.tile * 0.55) continue;
        actor.superCharge = Math.min(1, actor.superCharge + pad.def.chargePerSecond * dt);
        this.onEvent('pad-charge', { pad, actor });
      }
    }
  }
}
