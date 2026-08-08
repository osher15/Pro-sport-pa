/**
 * BrawlZ: Cursed Arenas — Combat Core
 *
 * Pure logic: HP, damage, cooldowns, attack resolution, death/respawn, and the
 * voice-line director. Nothing here touches Phaser, the DOM, or any renderer —
 * the same rules are mirrored 1:1 by the Unity scripts in /unity.
 *
 * Positions are plain numbers fed in by the presentation layer every frame
 * (fighter.syncToActor()), so the core can be unit-tested headlessly.
 */
(function (global) {
  'use strict';

  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  /* ------------------------------------------------------------------ *
   * Tuning — the knobs a designer touches. Anything a character can
   * override lives in characters.json; this is the default table.
   * ------------------------------------------------------------------ */
  var TUNING = {
    /** stats.speed is a multiplier; 1.0 => this many pixels per second. */
    // Dropped from 190: at the old value a fighter crossed the arena in under
    // four seconds, which reads as skating rather than running.
    pixelsPerSpeedUnit: 152,

    melee: {
      reach: 110,          // px from body edge
      arcDeg: 120,         // cone width of the swing
      windup: 0.10,        // s before the hit registers
      recover: 0.16,       // s locked after the hit
      cooldown: 0.60,      // s between swings
      knockback: 160
    },

    ranged: {
      reach: 620,          // px before the shot expires
      windup: 0.08,
      recover: 0.12,
      cooldown: 0.90,
      projectileSpeed: 660,
      projectileRadius: 14,
      knockback: 90
    },

    /**
     * Ammo, not a single cooldown. Every basic attack spends one pip and pips
     * refill one at a time — this is what creates the "do I dump everything or
     * save one to escape" rhythm the genre runs on.
     */
    ammo: { capacity: 3, reloadTime: 1.5 },

    /**
     * The super is earned, not waited out: it charges from damage dealt. A
     * character without an explicit charge_damage derives one from its old
     * cooldown value so existing design data still tunes it.
     */
    superChargePerCooldownSecond: 150,

    /** Out-of-combat healing, the thing that makes poking in and out work. */
    regen: { delay: 3.0, fractionPerSecond: 0.12 },

    respawnDelay: 4.0,     // s
    spawnProtection: 1.2,  // s of invulnerability after respawn
    ultimateLock: 0.35,    // s the caster is locked while the ult fires

    /** Used when an ultimate has no explicit "damage" field in the JSON. */
    ultimateDamageFallback: function (stats) { return stats.attack_damage * 4; }
  };

  /* ------------------------------------------------------------------ *
   * Tiny event emitter
   * ------------------------------------------------------------------ */
  function Emitter() { this._handlers = {}; }

  Emitter.prototype.on = function (event, fn) {
    (this._handlers[event] || (this._handlers[event] = [])).push(fn);
    var self = this;
    return function () { self.off(event, fn); };
  };

  Emitter.prototype.off = function (event, fn) {
    var list = this._handlers[event];
    if (!list) return;
    var i = list.indexOf(fn);
    if (i >= 0) list.splice(i, 1);
  };

  Emitter.prototype.emit = function (event, payload) {
    var list = this._handlers[event];
    if (!list) return;
    var copy = list.slice();          // handlers may unsubscribe while firing
    for (var i = 0; i < copy.length; i++) copy[i](payload);
  };

  /* ------------------------------------------------------------------ *
   * Cooldown
   * ------------------------------------------------------------------ */
  function Cooldown(duration) {
    this.duration = duration;
    this.remaining = 0;
  }
  Cooldown.prototype.tick = function (dt) {
    if (this.remaining > 0) this.remaining = Math.max(0, this.remaining - dt);
  };
  Cooldown.prototype.ready = function () { return this.remaining <= 0; };
  Cooldown.prototype.trigger = function (override) {
    this.remaining = override != null ? override : this.duration;
  };
  Cooldown.prototype.progress = function () {
    if (this.duration <= 0) return 1;
    return 1 - this.remaining / this.duration;
  };

  /* ------------------------------------------------------------------ *
   * CombatActor — one fighter's rules-side state
   * ------------------------------------------------------------------ */
  function CombatActor(def, options) {
    options = options || {};

    this.def = def;
    this.id = options.instanceId || def.id;
    this.name = def.name;
    this.displayName = def.name_he || def.name;
    this.category = def.category;
    this.team = options.team == null ? 0 : options.team;
    this.isPlayer = !!options.isPlayer;

    this.stats = def.stats;
    this.rangeType = def.stats.attack_range === 'ranged' ? 'ranged' : 'melee';

    /**
     * Base numbers, before anything modifies them. Everything that can be
     * changed by a Core, a status effect or a match rule is derived from here
     * in recompute() — nothing downstream ever reads these directly.
     */
    var baseProfile = TUNING[this.rangeType];
    this.base = {
      hp: def.stats.hp,
      speed: def.stats.speed * TUNING.pixelsPerSpeedUnit,
      damage: def.stats.attack_damage,
      reach: baseProfile.reach,
      cooldown: baseProfile.cooldown,
      ammo: def.stats.ammo || TUNING.ammo.capacity,
      reload: def.stats.reload_time || TUNING.ammo.reloadTime,
      projectileSpeed: baseProfile.projectileSpeed || 0,
      ultRadius: (def.ultimate && def.ultimate.radius) || 160
    };

    /** Equipped modifier sources (Cores today; Mutations and Gear later). */
    this.mods = [];
    /** Live timed effects (burn, slow, …). */
    this.effects = [];

    this.ultimate = def.ultimate || null;
    this.attackCooldown = new Cooldown(this.base.cooldown);
    this.reloadTimer = 0;

    this.recompute();
    this.hp = this.maxHp;
    this.ammo = this.ammoCapacity;

    // ---- super charge ----
    this.superNeed = (this.ultimate && this.ultimate.charge_damage) ||
      ((this.ultimate ? this.ultimate.cooldown : 15) * TUNING.superChargePerCooldownSecond);
    this.superCharge = 0;          // 0..1

    // ---- regen ----
    this.sinceDamaged = TUNING.regen.delay;

    // Live transform, pushed in by the renderer each frame.
    this.x = options.x || 0;
    this.y = options.y || 0;
    this.spawnX = this.x;
    this.spawnY = this.y;
    this.aim = 0;                 // radians

    this.alive = true;
    this.state = 'idle';          // idle | attacking | ultimate | dead
    this.busyTimer = 0;           // windup/recover lock
    this.respawnTimer = 0;
    this.invulnerableFor = 0;

    this.kills = 0;
    this.deaths = 0;
    this.damageDealt = 0;
  }

  /* ---------------- modifier pipeline ---------------- */

  /**
   * Folds base stats through every equipped modifier and every live effect,
   * and republishes the results under the names the renderers already read
   * (moveSpeed, profile, maxHp, ammoCapacity, reloadTime).
   *
   * A modifier is `{ id, stats: { speed: { mul: 1.2, add: 0 }, … } }`. Adds are
   * applied before multipliers so that two sources cannot silently reorder each
   * other — with the reverse order the result depends on equip order, which is
   * the kind of bug nobody ever finds.
   */
  CombatActor.prototype.recompute = function () {
    var keys = ['hp', 'speed', 'damage', 'reach', 'cooldown', 'ammo',
                'reload', 'projectileSpeed', 'ultRadius'];
    var out = {};
    var i, k, entry;

    for (i = 0; i < keys.length; i++) {
      k = keys[i];
      var add = 0;
      var mul = 1;

      for (var m = 0; m < this.mods.length; m++) {
        entry = (this.mods[m].stats || {})[k];
        if (!entry) continue;
        add += entry.add || 0;
        mul *= entry.mul == null ? 1 : entry.mul;
      }
      for (var e = 0; e < this.effects.length; e++) {
        entry = (this.effects[e].stats || {})[k];
        if (!entry) continue;
        add += entry.add || 0;
        mul *= entry.mul == null ? 1 : entry.mul;
      }
      out[k] = (this.base[k] + add) * mul;
    }

    // Health is the one stat where a change mid-match has to preserve how hurt
    // you are, not how many points you have left.
    var ratio = this.maxHp ? this.hp / this.maxHp : 1;
    this.maxHp = Math.max(1, Math.round(out.hp));
    if (this.hp != null) this.hp = Math.min(this.maxHp, Math.max(0, this.maxHp * ratio));

    this.moveSpeed = out.speed;
    this.damage = Math.max(0, Math.round(out.damage));
    this.ammoCapacity = Math.max(1, Math.round(out.ammo));
    this.reloadTime = Math.max(0.05, out.reload);

    // A fresh object, never the shared TUNING table: mutating that would change
    // every fighter of the same range type in the match.
    var baseProfile = TUNING[this.rangeType];
    this.profile = {
      reach: out.reach,
      arcDeg: baseProfile.arcDeg,
      windup: baseProfile.windup,
      recover: baseProfile.recover,
      cooldown: Math.max(0.05, out.cooldown),
      knockback: baseProfile.knockback,
      projectileSpeed: out.projectileSpeed,
      projectileRadius: baseProfile.projectileRadius
    };
    this.attackCooldown.duration = this.profile.cooldown;
    this.ultRadius = out.ultRadius;

    if (this.ammo != null) this.ammo = Math.min(this.ammo, this.ammoCapacity);
  };

  CombatActor.prototype.addModifier = function (mod) {
    this.removeModifier(mod.id);
    this.mods.push(mod);
    this.recompute();
    return mod;
  };

  CombatActor.prototype.removeModifier = function (id) {
    for (var i = this.mods.length - 1; i >= 0; i--) {
      if (this.mods[i].id === id) this.mods.splice(i, 1);
    }
    this.recompute();
  };

  CombatActor.prototype.hasModifier = function (id) {
    for (var i = 0; i < this.mods.length; i++) if (this.mods[i].id === id) return true;
    return false;
  };

  /**
   * Applies a timed effect. Re-applying the same id refreshes it rather than
   * stacking — otherwise a fast-firing weapon would lock a target in a slow
   * forever just by hitting it.
   */
  CombatActor.prototype.applyEffect = function (effect) {
    for (var i = 0; i < this.effects.length; i++) {
      if (this.effects[i].id !== effect.id) continue;
      this.effects[i] = effect;
      this.recompute();
      return effect;
    }
    this.effects.push(effect);
    this.recompute();
    return effect;
  };

  CombatActor.prototype.clearEffects = function () {
    if (!this.effects.length) return;
    this.effects.length = 0;
    this.recompute();
  };

  /** Lets equipped modifiers react to a combat event. */
  CombatActor.prototype.fireHook = function (name, payload) {
    for (var i = 0; i < this.mods.length; i++) {
      var hooks = this.mods[i].hooks;
      if (hooks && typeof hooks[name] === 'function') hooks[name](this, payload);
    }
  };

  CombatActor.prototype.hpRatio = function () {
    return Math.max(0, this.hp / this.maxHp);
  };

  CombatActor.prototype.canAct = function () {
    return this.alive && this.busyTimer <= 0;
  };

  CombatActor.prototype.canMove = function () {
    return this.alive && this.state !== 'ultimate';
  };

  CombatActor.prototype.superReady = function () {
    return this.superCharge >= 1;
  };

  CombatActor.prototype.ammoRatio = function () {
    return this.ammo / this.ammoCapacity;
  };

  /** Progress of the pip currently reloading, 0..1. */
  CombatActor.prototype.reloadProgress = function () {
    if (this.ammo >= this.ammoCapacity) return 1;
    return 1 - this.reloadTimer / this.reloadTime;
  };

  CombatActor.prototype.ultimateDamage = function () {
    if (!this.ultimate) return 0;
    if (this.ultimate.damage != null) return this.ultimate.damage;
    return TUNING.ultimateDamageFallback(this.stats);
  };

  /* ------------------------------------------------------------------ *
   * CombatSystem — owns every actor and resolves every interaction
   *
   * Events: spawn, attack, damage, kill, death, ultimate, respawn-pending
   * ------------------------------------------------------------------ */
  function CombatSystem() {
    Emitter.call(this);
    this.actors = [];
    this.time = 0;
  }
  CombatSystem.prototype = Object.create(Emitter.prototype);
  CombatSystem.prototype.constructor = CombatSystem;

  CombatSystem.prototype.add = function (actor) {
    this.actors.push(actor);
    this.emit('spawn', { actor: actor, initial: true });
    return actor;
  };

  /**
   * A null actor means the arena itself — a meteor, a hazard zone, the storm.
   * The arena has no team, so everybody alive is a valid target for it.
   */
  CombatSystem.prototype.enemiesOf = function (actor) {
    var out = [];
    for (var i = 0; i < this.actors.length; i++) {
      var other = this.actors[i];
      if (!other.alive || other === actor) continue;
      if (actor && other.team === actor.team) continue;
      out.push(other);
    }
    return out;
  };

  CombatSystem.prototype.update = function (dt) {
    this.time += dt;
    for (var i = 0; i < this.actors.length; i++) {
      var a = this.actors[i];
      a.attackCooldown.tick(dt);
      if (a.invulnerableFor > 0) a.invulnerableFor = Math.max(0, a.invulnerableFor - dt);

      // reload one pip at a time
      if (a.alive && a.ammo < a.ammoCapacity) {
        a.reloadTimer -= dt;
        if (a.reloadTimer <= 0) {
          a.ammo += 1;
          a.reloadTimer = a.ammo < a.ammoCapacity ? a.reloadTime : 0;
          this.emit('reload', { actor: a, ammo: a.ammo });
        }
      }

      // out-of-combat healing
      if (a.alive) {
        a.sinceDamaged += dt;
        if (a.sinceDamaged >= TUNING.regen.delay && a.hp < a.maxHp) {
          a.hp = Math.min(a.maxHp, a.hp + a.maxHp * TUNING.regen.fractionPerSecond * dt);
        }
      }

      if (a.alive) this.tickEffects(a, dt);
      if (a.alive) a.fireHook('onTick', { dt: dt, system: this });

      if (a.busyTimer > 0) {
        a.busyTimer = Math.max(0, a.busyTimer - dt);
        if (a.busyTimer === 0 && a.alive) a.state = 'idle';
      }

      if (!a.alive) {
        a.respawnTimer -= dt;
        if (a.respawnTimer <= 0) this.respawn(a);
      }
    }
  };

  /**
   * Runs one actor's timed effects: counts them down, applies any per-second
   * damage they carry, and recomputes stats when one expires.
   *
   * Damage-over-time is credited to whoever applied it, so a burn that finishes
   * a target still counts as that player's kill and still charges their super.
   */
  CombatSystem.prototype.tickEffects = function (actor, dt) {
    if (!actor.effects.length) return;
    var expired = false;

    for (var i = actor.effects.length - 1; i >= 0; i--) {
      var fx = actor.effects[i];
      fx.remaining -= dt;

      if (fx.damagePerSecond) {
        this.applyDamage(fx.source || null, actor, fx.damagePerSecond * dt, {
          source: fx.id, silent: true
        });
        if (!actor.alive) return;
      }

      if (fx.remaining <= 0) {
        actor.effects.splice(i, 1);
        expired = true;
        this.emit('effect-end', { actor: actor, effect: fx });
      }
    }
    if (expired) actor.recompute();
  };

  /* ---------------- basic attack ---------------- */

  /**
   * Starts a basic attack if allowed. Returns a plan the renderer executes
   * after `windup` seconds (melee => system.resolveMelee, ranged => spawn a
   * projectile that calls system.applyDamage on contact).
   */
  CombatSystem.prototype.requestAttack = function (actor) {
    if (!actor.canAct() || !actor.attackCooldown.ready()) return null;
    if (actor.ammo < 1) return null;                  // out of ammo: nothing fires

    var p = actor.profile;
    actor.attackCooldown.trigger();

    actor.ammo -= 1;
    if (actor.reloadTimer <= 0) actor.reloadTimer = actor.reloadTime;
    actor.state = 'attacking';
    actor.busyTimer = p.windup + p.recover;

    // Fires on pulling the trigger, not on connecting. A Core that reacts to
    // "you attacked" must not be able to stay hidden by missing.
    actor.fireHook('onAttack', { actor: actor });

    var plan = {
      actor: actor,
      kind: actor.rangeType,
      damage: actor.damage,
      windup: p.windup,
      reach: p.reach,
      arcDeg: p.arcDeg,
      knockback: p.knockback,
      projectileSpeed: p.projectileSpeed,
      projectileRadius: p.projectileRadius,
      aim: actor.aim
    };
    this.emit('attack', plan);
    return plan;
  };

  /** Cone hit-test used by melee swings (and by AoE when arcDeg >= 360). */
  CombatSystem.prototype.resolveMelee = function (actor, plan) {
    var targets = this.enemiesOf(actor);
    var halfArc = ((plan.arcDeg || 360) * Math.PI) / 180 / 2;
    var hits = [];

    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var dx = t.x - actor.x;
      var dy = t.y - actor.y;
      var dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > plan.reach) continue;

      if (halfArc < Math.PI) {
        var delta = angleDelta(Math.atan2(dy, dx), plan.aim);
        if (Math.abs(delta) > halfArc) continue;
      }
      if (this.applyDamage(actor, t, plan.damage, { knockback: plan.knockback })) hits.push(t);
    }
    return hits;
  };

  /** Radial hit-test used by ultimates and explosions. */
  CombatSystem.prototype.resolveAoe = function (actor, x, y, radius, damage, opts) {
    opts = opts || {};
    var targets = this.enemiesOf(actor);
    var hits = [];
    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var dx = t.x - x;
      var dy = t.y - y;
      if (Math.sqrt(dx * dx + dy * dy) > radius) continue;
      if (this.applyDamage(actor, t, damage, {
        knockback: opts.knockback || 0,
        originX: x,
        originY: y,
        source: opts.source || 'ultimate'
      })) hits.push(t);
    }
    return hits;
  };

  /**
   * Swept hit-test along a travelled path — a radius dragged from one point to
   * another. Leaping ultimates use this so a fast dash that overshoots a nearby
   * target still connects: a landing-point-only blast would detonate behind
   * whoever it just flew over.
   */
  CombatSystem.prototype.resolveCapsule = function (actor, x1, y1, x2, y2, radius, damage, opts) {
    opts = opts || {};
    var targets = this.enemiesOf(actor);
    var hits = [];

    for (var i = 0; i < targets.length; i++) {
      var t = targets[i];
      var near = closestPointOnSegment(t.x, t.y, x1, y1, x2, y2);
      var dx = t.x - near.x;
      var dy = t.y - near.y;
      if (Math.sqrt(dx * dx + dy * dy) > radius) continue;

      if (this.applyDamage(actor, t, damage, {
        knockback: opts.knockback || 0,
        originX: near.x,
        originY: near.y,
        source: opts.source || 'ultimate'
      })) hits.push(t);
    }
    return hits;
  };

  /* ---------------- damage / death ---------------- */

  CombatSystem.prototype.applyDamage = function (source, target, amount, opts) {
    opts = opts || {};
    if (!target.alive || target.invulnerableFor > 0) return false;

    // Not rounded here on purpose. Damage-over-time arrives as a fraction of a
    // point per frame, and rounding each tick would either erase it entirely or
    // inflate it by 60x. Integers are unaffected; only the display rounds.
    var dealt = Math.max(0, amount);
    target.hp = Math.max(0, target.hp - dealt);
    target.sinceDamaged = 0;                      // taking a hit stops healing

    if (source) {
      source.damageDealt += dealt;
      // The super is earned by connecting, not by waiting.
      if (source !== target && source.superNeed > 0) {
        source.superCharge = Math.min(1, source.superCharge + dealt / source.superNeed);
      }
    }

    var ox = opts.originX == null ? (source ? source.x : target.x) : opts.originX;
    var oy = opts.originY == null ? (source ? source.y : target.y) : opts.originY;
    var ang = Math.atan2(target.y - oy, target.x - ox);

    var event = {
      source: source,
      target: target,
      amount: Math.round(dealt),
      raw: dealt,
      remaining: target.hp,
      knockback: opts.knockback || 0,
      angle: ang,
      kind: opts.source || 'basic',
      // Set by damage-over-time ticks: real damage, but the renderer should not
      // fire a full flash-and-sparks for each frame of a burn.
      silent: !!opts.silent
    };

    // Cores react here. onHit fires for whoever dealt it, onTakeDamage for
    // whoever received it — that pair covers burn-on-hit, slow-on-hit,
    // thorns, lifesteal and most of what a Core will ever want to do.
    if (source && source !== target) source.fireHook('onHit', event);
    target.fireHook('onTakeDamage', event);

    this.emit('damage', event);

    if (target.hp <= 0) this.kill(source || null, target);
    return true;
  };

  /** Killed by `source`, or by the arena when source is null. */
  CombatSystem.prototype.kill = function (source, target) {
    target.alive = false;
    target.state = 'dead';
    target.busyTimer = 0;
    target.deaths += 1;
    target.respawnTimer = TUNING.respawnDelay;
    target.clearEffects();

    if (source && source !== target) {
      source.kills += 1;
      source.fireHook('onKill', { source: source, target: target });
      this.emit('kill', { source: source, target: target });
    }
    this.emit('death', { actor: target, killer: source || null });
  };

  CombatSystem.prototype.respawn = function (actor) {
    actor.alive = true;
    actor.clearEffects();
    actor.hp = actor.maxHp;
    actor.state = 'idle';
    actor.busyTimer = 0;
    actor.respawnTimer = 0;
    actor.invulnerableFor = TUNING.spawnProtection;
    actor.x = actor.spawnX;
    actor.y = actor.spawnY;
    actor.attackCooldown.trigger(0);
    actor.ammo = actor.ammoCapacity;
    actor.reloadTimer = 0;
    actor.sinceDamaged = TUNING.regen.delay;
    this.emit('spawn', { actor: actor, initial: false });
  };

  /* ---------------- ultimate ---------------- */

  /**
   * Validates and starts an ultimate. The actual effect is looked up in
   * BrawlZ.Ultimates by the ultimate's name, so adding a character to the JSON
   * needs no changes here — an unknown name falls back to a generic AoE burst.
   */
  CombatSystem.prototype.requestUltimate = function (actor) {
    if (!actor.canAct() || !actor.ultimate || !actor.superReady()) return null;

    actor.superCharge = 0;
    actor.state = 'ultimate';
    actor.busyTimer = TUNING.ultimateLock;

    actor.fireHook('onUltimate', { actor: actor });

    var payload = {
      actor: actor,
      ultimate: actor.ultimate,
      damage: actor.ultimateDamage(),
      radius: actor.ultRadius,
      aim: actor.aim
    };
    this.emit('ultimate', payload);
    return payload;
  };

  /* ------------------------------------------------------------------ *
   * VoiceDirector — turns combat events into the slang lines from the JSON
   * ------------------------------------------------------------------ */
  function VoiceDirector(system, options) {
    options = options || {};
    this.system = system;
    this.onLine = options.onLine || function () {};
    this.echoToConsole = options.echoToConsole !== false;
    this.minGap = options.minGap == null ? 0.35 : options.minGap;
    this._last = {};

    var self = this;
    system.on('spawn', function (e) { self.say(e.actor, 'spawn'); });
    system.on('kill', function (e) { self.say(e.source, 'kill'); });
    system.on('death', function (e) { self.say(e.actor, 'death'); });
    system.on('ultimate', function (e) { self.say(e.actor, 'ultimate_cast'); });
  }

  VoiceDirector.LABELS = {
    spawn: 'כניסה לזירה',
    kill: 'הרג',
    death: 'מוות',
    ultimate_cast: 'אולטימייט'
  };

  VoiceDirector.prototype.say = function (actor, key) {
    if (!actor) return;
    var lines = actor.def.voice_lines || {};
    var text = lines[key];
    if (!text) return;

    var stamp = this.system.time;
    var last = this._last[actor.id + ':' + key];
    if (last != null && stamp - last < this.minGap) return;
    this._last[actor.id + ':' + key] = stamp;

    var line = {
      actor: actor,
      key: key,
      label: VoiceDirector.LABELS[key] || key,
      text: text,
      speaker: actor.displayName,
      time: stamp
    };

    if (this.echoToConsole) {
      console.log('[' + line.label + '] ' + line.speaker + ': ' + text);
    }
    this.onLine(line);
  };

  /* ------------------------------------------------------------------ *
   * helpers
   * ------------------------------------------------------------------ */
  function closestPointOnSegment(px, py, x1, y1, x2, y2) {
    var dx = x2 - x1;
    var dy = y2 - y1;
    var lenSq = dx * dx + dy * dy;
    if (lenSq < 1e-6) return { x: x1, y: y1 };
    var t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    return { x: x1 + dx * t, y: y1 + dy * t };
  }

  function angleDelta(a, b) {
    var d = a - b;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    return d;
  }

  BrawlZ.TUNING = TUNING;
  BrawlZ.Emitter = Emitter;
  BrawlZ.Cooldown = Cooldown;
  BrawlZ.CombatActor = CombatActor;
  BrawlZ.CombatSystem = CombatSystem;
  BrawlZ.VoiceDirector = VoiceDirector;
  BrawlZ.angleDelta = angleDelta;
})(typeof window !== 'undefined' ? window : globalThis);
