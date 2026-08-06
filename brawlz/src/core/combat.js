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
    pixelsPerSpeedUnit: 190,

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
    this.maxHp = def.stats.hp;
    this.hp = this.maxHp;

    this.moveSpeed = def.stats.speed * TUNING.pixelsPerSpeedUnit;
    this.rangeType = def.stats.attack_range === 'ranged' ? 'ranged' : 'melee';
    this.profile = TUNING[this.rangeType];

    this.ultimate = def.ultimate || null;

    this.attackCooldown = new Cooldown(this.profile.cooldown);
    this.ultimateCooldown = new Cooldown(this.ultimate ? this.ultimate.cooldown : 15);

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

  CombatActor.prototype.hpRatio = function () {
    return Math.max(0, this.hp / this.maxHp);
  };

  CombatActor.prototype.canAct = function () {
    return this.alive && this.busyTimer <= 0;
  };

  CombatActor.prototype.canMove = function () {
    return this.alive && this.state !== 'ultimate';
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

  CombatSystem.prototype.enemiesOf = function (actor) {
    var out = [];
    for (var i = 0; i < this.actors.length; i++) {
      var other = this.actors[i];
      if (other !== actor && other.alive && other.team !== actor.team) out.push(other);
    }
    return out;
  };

  CombatSystem.prototype.update = function (dt) {
    this.time += dt;
    for (var i = 0; i < this.actors.length; i++) {
      var a = this.actors[i];
      a.attackCooldown.tick(dt);
      a.ultimateCooldown.tick(dt);
      if (a.invulnerableFor > 0) a.invulnerableFor = Math.max(0, a.invulnerableFor - dt);

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

  /* ---------------- basic attack ---------------- */

  /**
   * Starts a basic attack if allowed. Returns a plan the renderer executes
   * after `windup` seconds (melee => system.resolveMelee, ranged => spawn a
   * projectile that calls system.applyDamage on contact).
   */
  CombatSystem.prototype.requestAttack = function (actor) {
    if (!actor.canAct() || !actor.attackCooldown.ready()) return null;

    var p = actor.profile;
    actor.attackCooldown.trigger();
    actor.state = 'attacking';
    actor.busyTimer = p.windup + p.recover;

    var plan = {
      actor: actor,
      kind: actor.rangeType,
      damage: actor.stats.attack_damage,
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

  /* ---------------- damage / death ---------------- */

  CombatSystem.prototype.applyDamage = function (source, target, amount, opts) {
    opts = opts || {};
    if (!target.alive || target.invulnerableFor > 0) return false;

    var dealt = Math.max(0, Math.round(amount));
    target.hp = Math.max(0, target.hp - dealt);
    if (source) source.damageDealt += dealt;

    var ox = opts.originX == null ? (source ? source.x : target.x) : opts.originX;
    var oy = opts.originY == null ? (source ? source.y : target.y) : opts.originY;
    var ang = Math.atan2(target.y - oy, target.x - ox);

    this.emit('damage', {
      source: source,
      target: target,
      amount: dealt,
      remaining: target.hp,
      knockback: opts.knockback || 0,
      angle: ang,
      kind: opts.source || 'basic'
    });

    if (target.hp <= 0) this.kill(source, target);
    return true;
  };

  CombatSystem.prototype.kill = function (source, target) {
    target.alive = false;
    target.state = 'dead';
    target.busyTimer = 0;
    target.deaths += 1;
    target.respawnTimer = TUNING.respawnDelay;

    if (source && source !== target) {
      source.kills += 1;
      this.emit('kill', { source: source, target: target });
    }
    this.emit('death', { actor: target, killer: source || null });
  };

  CombatSystem.prototype.respawn = function (actor) {
    actor.alive = true;
    actor.hp = actor.maxHp;
    actor.state = 'idle';
    actor.busyTimer = 0;
    actor.respawnTimer = 0;
    actor.invulnerableFor = TUNING.spawnProtection;
    actor.x = actor.spawnX;
    actor.y = actor.spawnY;
    actor.attackCooldown.trigger(0);
    this.emit('spawn', { actor: actor, initial: false });
  };

  /* ---------------- ultimate ---------------- */

  /**
   * Validates and starts an ultimate. The actual effect is looked up in
   * BrawlZ.Ultimates by the ultimate's name, so adding a character to the JSON
   * needs no changes here — an unknown name falls back to a generic AoE burst.
   */
  CombatSystem.prototype.requestUltimate = function (actor) {
    if (!actor.canAct() || !actor.ultimate || !actor.ultimateCooldown.ready()) return null;

    actor.ultimateCooldown.trigger();
    actor.state = 'ultimate';
    actor.busyTimer = TUNING.ultimateLock;

    var payload = {
      actor: actor,
      ultimate: actor.ultimate,
      damage: actor.ultimateDamage(),
      radius: actor.ultimate.radius || 160,
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
