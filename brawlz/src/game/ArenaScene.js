/**
 * ArenaScene — wires the combat core to Phaser: spawning, projectiles, hit
 * feedback, and the bridge from combat events to HUD / speech bubbles.
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  var W = 960;
  var H = 540;

  function ArenaScene() {
    Phaser.Scene.call(this, { key: 'Arena' });
  }
  ArenaScene.prototype = Object.create(Phaser.Scene.prototype);
  ArenaScene.prototype.constructor = ArenaScene;

  ArenaScene.prototype.init = function (data) {
    this.roster = data.roster;
    this.playerId = data.playerId;
    this.enemyId = data.enemyId;
    this.hud = data.hud;
  };

  /**
   * Loads the hand-made sprite for any character that declares one in
   * characters.json. A character without a "sprite" field (or whose file fails
   * to load) falls back to the procedural placeholder, so the roster never
   * blocks on art being ready.
   */
  ArenaScene.prototype.preload = function () {
    var self = this;
    this.roster.forEach(function (def) {
      if (!def.sprite) return;
      self.load.image('sprite_' + def.id, def.sprite);
    });

    this.load.on('loaderror', function (file) {
      console.warn('[BrawlZ] sprite failed to load (' + file.key + ') — using the placeholder art.');
    });
  };

  ArenaScene.prototype.create = function () {
    var self = this;
    BrawlZ.scene = this;      // debug handle: BrawlZ.scene.combat.actors in the console

    this.physics.world.setBounds(24, 24, W - 48, H - 48);

    // ---- arena floor -------------------------------------------------
    BrawlZ.Textures.makeArenaTexture(this, 'arena_tile');
    this.add.tileSprite(W / 2, H / 2, W, H, 'arena_tile').setDepth(0);
    var ring = this.add.graphics().setDepth(1);
    ring.lineStyle(6, 0x4a3f7a, 1);
    ring.strokeRoundedRect(24, 24, W - 48, H - 48, 26);
    ring.lineStyle(2, 0x7b6bd6, 0.35);
    ring.strokeCircle(W / 2, H / 2, 160);

    // ---- combat core -------------------------------------------------
    this.combat = new BrawlZ.CombatSystem();
    this.fighters = [];
    this.fighterByActor = new Map();

    this.voice = new BrawlZ.VoiceDirector(this.combat, {
      onLine: function (line) {
        self.hud.pushLine(line);
        var f = self.fighterByActor.get(line.actor);
        if (f) f.say(line.text);
      }
    });

    this.projectiles = this.physics.add.group();

    this.bindCombatEvents();

    // ---- fighters ----------------------------------------------------
    var playerDef = this.findDef(this.playerId);
    var enemyDef = this.findDef(this.enemyId);

    var player = this.spawnFighter(playerDef, { x: 250, y: H / 2, team: 0, isPlayer: true });
    var enemy = this.spawnFighter(enemyDef, { x: W - 250, y: H / 2, team: 1, instanceId: 'bot_1' });

    this.playerController = new BrawlZ.PlayerController(this, player);
    this.controllers = [new BrawlZ.BotController(this, enemy)];

    this.physics.add.collider(player.sprite, enemy.sprite);

    this.hud.bind(player.actor, enemy.actor);
    this.player = player;

    // ---- fx layers ---------------------------------------------------
    this.fxGfx = this.add.graphics().setDepth(15);

    this.events.on('shutdown', function () { self.combat = null; });
  };

  ArenaScene.prototype.findDef = function (id) {
    for (var i = 0; i < this.roster.length; i++) {
      if (this.roster[i].id === id) return this.roster[i];
    }
    return this.roster[0];
  };

  /* ------------------------------------------------------------------ *
   * spawning
   * ------------------------------------------------------------------ */
  ArenaScene.prototype.spawnFighter = function (def, opts) {
    var actor = new BrawlZ.CombatActor(def, opts);
    var fighter = new BrawlZ.Fighter(this, actor);

    this.fighters.push(fighter);
    this.fighterByActor.set(actor, fighter);

    var self = this;
    this.physics.add.overlap(this.projectiles, fighter.sprite, function (a, b) {
      self.onProjectileHit(a, b);
    });

    this.combat.add(actor);   // fires 'spawn' → voice line → bubble
    return fighter;
  };

  ArenaScene.prototype.nearestEnemy = function (actor) {
    var candidates = this.combat.enemiesOf(actor);
    var best = null;
    var bestDist = Infinity;
    for (var i = 0; i < candidates.length; i++) {
      var dx = candidates[i].x - actor.x;
      var dy = candidates[i].y - actor.y;
      var d = dx * dx + dy * dy;
      if (d < bestDist) { bestDist = d; best = candidates[i]; }
    }
    return best;
  };

  /* ------------------------------------------------------------------ *
   * combat event → feedback
   * ------------------------------------------------------------------ */
  ArenaScene.prototype.bindCombatEvents = function () {
    var self = this;

    this.combat.on('damage', function (e) {
      var f = self.fighterByActor.get(e.target);
      if (!f) return;
      f.flash(e.kind === 'ultimate' ? 0xffe066 : 0xffffff);
      f.knockback(e.angle, e.knockback);
      self.floatingText(
        f.sprite.x, f.sprite.y - 40, '-' + e.amount,
        e.kind === 'ultimate' ? '#ffd166' : '#ffffff',
        e.kind === 'ultimate' ? 28 : 20
      );
    });

    this.combat.on('death', function (e) {
      var f = self.fighterByActor.get(e.actor);
      if (f) f.onDeath();
    });

    this.combat.on('spawn', function (e) {
      if (e.initial) return;
      var f = self.fighterByActor.get(e.actor);
      if (f) f.onRespawn();
    });
  };

  /* ------------------------------------------------------------------ *
   * projectiles
   * ------------------------------------------------------------------ */
  ArenaScene.prototype.spawnProjectile = function (cfg) {
    var key = 'proj_' + cfg.color.replace('#', '') + '_' + cfg.radius;
    BrawlZ.Textures.makeCircleTexture(this, key, cfg.radius, cfg.color);

    var img = this.projectiles.create(cfg.x, cfg.y, key);
    img.setDepth(8);
    img.body.setAllowGravity(false);
    img.body.setCircle(cfg.radius);
    img.setVelocity(Math.cos(cfg.angle) * cfg.speed, Math.sin(cfg.angle) * cfg.speed);
    if (cfg.spin) img.setAngularVelocity(cfg.spin * 60);

    img.meta = {
      owner: cfg.owner,
      damage: cfg.damage,
      knockback: cfg.knockback || 0,
      aoeRadius: cfg.aoeRadius || 0,
      range: cfg.range,
      startX: cfg.x,
      startY: cfg.y,
      onEnd: cfg.onEnd || null,
      label: cfg.label || 'basic'
    };
    return img;
  };

  /**
   * Phaser hands the callback (sprite, groupChild) when a group is paired with
   * a single sprite — the opposite of the registration order — so work out
   * which argument is which instead of trusting the position.
   */
  ArenaScene.prototype.onProjectileHit = function (a, b) {
    var projectile = a && a.meta ? a : b;
    var sprite = projectile === a ? b : a;
    if (!projectile || !projectile.active || !projectile.meta) return;
    if (!sprite || !sprite.fighter) return;

    var meta = projectile.meta;
    var target = sprite.fighter.actor;
    if (!target.alive || target.team === meta.owner.team) return;
    if (target.invulnerableFor > 0) return;

    if (meta.aoeRadius > 0) {
      this.shockwave(projectile.x, projectile.y, meta.aoeRadius, '#ffb3e6');
      this.combat.resolveAoe(meta.owner, projectile.x, projectile.y, meta.aoeRadius, meta.damage, {
        knockback: meta.knockback,
        source: 'ultimate'
      });
    } else if (meta.damage > 0) {
      this.combat.applyDamage(meta.owner, target, meta.damage, { knockback: meta.knockback });
    }
    this.retireProjectile(projectile);
  };

  ArenaScene.prototype.retireProjectile = function (projectile) {
    var meta = projectile.meta;
    var x = projectile.x;
    var y = projectile.y;
    projectile.meta = null;
    projectile.destroy();
    if (meta && meta.onEnd) meta.onEnd(x, y);
  };

  /* ------------------------------------------------------------------ *
   * fx
   * ------------------------------------------------------------------ */
  ArenaScene.prototype.showSwing = function (fighter, plan) {
    var g = this.add.graphics().setDepth(14);
    var half = (plan.arcDeg * Math.PI) / 180 / 2;
    g.fillStyle(Phaser.Display.Color.HexStringToColor(fighter.theme.accent).color, 0.35);
    g.slice(fighter.sprite.x, fighter.sprite.y, plan.reach, plan.aim - half, plan.aim + half, false);
    g.fillPath();
    this.tweens.add({
      targets: g, alpha: 0, duration: 180,
      onComplete: function () { g.destroy(); }
    });
  };

  ArenaScene.prototype.shockwave = function (x, y, radius, color) {
    var g = this.add.graphics().setDepth(14);
    var col = Phaser.Display.Color.HexStringToColor(color).color;
    var state = { r: radius * 0.25 };
    this.tweens.add({
      targets: state,
      r: radius,
      duration: 320,
      ease: 'Cubic.easeOut',
      onUpdate: function (tween) {
        g.clear();
        g.lineStyle(8, col, 1 - tween.progress);
        g.strokeCircle(x, y, state.r);
        g.fillStyle(col, 0.18 * (1 - tween.progress));
        g.fillCircle(x, y, state.r);
      },
      onComplete: function () { g.destroy(); }
    });
  };

  ArenaScene.prototype.floatingText = function (x, y, text, color, size) {
    var t = this.add.text(x, y, text, {
      fontFamily: BrawlZ.FONT,
      fontSize: (size || 20) + 'px',
      color: color,
      stroke: '#150f24',
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(32);

    this.tweens.add({
      targets: t,
      y: y - 46,
      alpha: 0,
      duration: 700,
      ease: 'Quad.easeOut',
      onComplete: function () { t.destroy(); }
    });
  };

  /* ------------------------------------------------------------------ *
   * loop
   * ------------------------------------------------------------------ */
  ArenaScene.prototype.update = function (time, delta) {
    var dt = Math.min(delta, 50) / 1000;   // clamp: tab-switch spikes

    this.playerController.update(dt);
    for (var i = 0; i < this.controllers.length; i++) this.controllers[i].update(dt);

    for (var j = 0; j < this.fighters.length; j++) this.fighters[j].update(dt);

    this.combat.update(dt);

    // expire projectiles that ran out of range
    var kids = this.projectiles.getChildren();
    for (var k = kids.length - 1; k >= 0; k--) {
      var p = kids[k];
      if (!p.active || !p.meta) continue;
      var dx = p.x - p.meta.startX;
      var dy = p.y - p.meta.startY;
      if (Math.sqrt(dx * dx + dy * dy) >= p.meta.range) this.retireProjectile(p);
    }

    this.hud.update();
  };

  BrawlZ.ArenaScene = ArenaScene;
  BrawlZ.ARENA_W = W;
  BrawlZ.ARENA_H = H;
})(typeof window !== 'undefined' ? window : globalThis);
