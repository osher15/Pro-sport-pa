/**
 * Cores — the behaviour half.
 *
 * A Core turns one character into several. The stat changes are data
 * (data/cores.json); what a Core *does* when you land a hit cannot be, so the
 * behaviour lives here keyed by id — exactly the split the ultimates registry
 * already uses.
 *
 * Every Core is built from the same two primitives the combat core provides:
 *   · stat modifiers, folded in CombatActor.recompute()
 *   · hooks on combat events (onHit / onTakeDamage / onKill / onTick / onUltimate)
 *
 * That is the whole contract. Adding a fourth Core means adding a row to the
 * JSON and, if it needs behaviour, one entry below. No engine code changes, and
 * nothing in combat.js needs to know a Core exists.
 *
 * No engine import: this layer would survive a port to another renderer.
 */

const BEHAVIOUR = {
  /**
   * Fire — every hit sets a burn that keeps ticking after you stop shooting.
   *
   * Deliberately does not stack: re-hitting refreshes the same burn rather than
   * adding a second one, or a fast weapon would multiply its own damage by its
   * fire rate and the Core would be strictly the best choice on every character.
   */
  core_fire(def) {
    const burn = def.burn || { fraction: 0.5, duration: 3 };
    return {
      onHit(self, e) {
        // Only direct hits ignite. Without this the burn re-ignites itself
        // every tick and never ends.
        if (e.kind === 'burn' || e.silent) return;
        e.target.applyEffect({
          id: 'burn',
          label_he: 'בוער',
          tint: 0xff6a2c,
          source: self,
          remaining: burn.duration,
          damagePerSecond: (e.raw * burn.fraction) / burn.duration
        });
      }
    };
  },

  /** Gravity — every hit drags the target down to a crawl. */
  core_gravity(def) {
    const slow = def.slow || { mul: 0.6, duration: 1.2 };
    return {
      onHit(self, e) {
        if (e.silent) return;
        e.target.applyEffect({
          id: 'slow',
          label_he: 'מואט',
          tint: 0x8a7bff,
          source: self,
          remaining: slow.duration,
          stats: { speed: { mul: slow.mul } }
        });
      }
    };
  },

  /**
   * Shadow — go quiet and you disappear.
   *
   * Firing breaks it, so the Core is a real decision every second rather than a
   * passive: the moment you take the shot you are visible again.
   */
  core_shadow(def) {
    const after = (def.vanish && def.vanish.afterSeconds) || 1.5;
    return {
      onSpawn(self) { self.quietFor = 0; self.vanished = false; },
      // Attacking breaks it, whether or not the shot lands — hiding by missing
      // would make the Core strictly better than not missing.
      onAttack(self) { self.quietFor = 0; self.vanished = false; },
      onUltimate(self) { self.quietFor = 0; self.vanished = false; },
      onTakeDamage(self) { self.quietFor = 0; self.vanished = false; },
      onTick(self, { dt }) {
        self.quietFor = (self.quietFor || 0) + dt;
        self.vanished = self.quietFor >= after;
      }
    };
  }
};

/**
 * Builds the modifier object a CombatActor can equip.
 * Returns null for the "no core" row so the base character stays untouched.
 */
export function buildCore(def) {
  if (!def || def.id === 'core_none') return null;
  const make = BEHAVIOUR[def.id];
  return {
    id: def.id,
    def,
    stats: def.stats || {},
    hooks: make ? make(def) : null
  };
}

/** Equips a core on an actor, replacing whatever it had. */
export function equipCore(actor, def) {
  for (const mod of actor.mods.slice()) {
    if (mod.id && mod.id.indexOf('core_') === 0) actor.removeModifier(mod.id);
  }
  const core = buildCore(def);
  if (core) {
    actor.addModifier(core);
    actor.fireHook('onSpawn', { actor });
  }
  actor.hp = actor.maxHp;
  actor.ammo = actor.ammoCapacity;
  return core;
}

/** The core currently equipped, or null. */
export function equippedCore(actor) {
  for (const mod of actor.mods) {
    if (mod.id && mod.id.indexOf('core_') === 0) return mod;
  }
  return null;
}

export const CORE_BEHAVIOUR = BEHAVIOUR;
