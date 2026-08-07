/**
 * ArenaScene — wires the combat core to Phaser: spawning, projectiles, hit
 * feedback, and the bridge from combat events to HUD / speech bubbles.
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  // The world is deliberately larger than the viewport so the camera has
  // somewhere to go — a fixed shot of the whole arena reads as a board game,
  // not as a brawler.
  var W = 1600;
  var H = 900;
  var VIEW_W = 960;
  var VIEW_H = 540;

  function ArenaScene() {
    Phaser.Scene.call(this, { key: 'Arena' });
  }
  ArenaScene.prototype = Object.create(Phaser.Scene.prototype);
  ArenaScene.prototype.constructor = ArenaScene;

  ArenaScene.prototype.init = function (data) {
    this.roster = data.roster;
    this.mapArt = data.mapArt || (global.BRAWLZ_MAP_ART || null) || {};
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
    var anySprite = false;
    this.roster.forEach(function (def) {
      if (def.sprite) {
        anySprite = true;
        self.load.image('sprite_' + def.id, def.sprite);
      }
      // Optional extra poses. Any subset works; missing ones fall back to the
      // base sprite, so a half-finished character still plays.
      Object.keys(def.frames || {}).forEach(function (name) {
        self.load.image('frame_' + def.id + '_' + name, def.frames[name]);
      });
    });

    // Optional map tile art. Absent files just leave the drawn shapes in place.
    ['wall', 'bush', 'floor'].forEach(function (name) {
      var path = (self.mapArt || {})[name];
      if (path) self.load.image('tile_' + name, path);
    });

    // Per-sprite foot anchors written by tools/dekey.py. Missing file just means
    // every sprite falls back to being anchored at its centre.
    if (anySprite && !global.BRAWLZ_SPRITE_META) {
      this.load.json('spriteMeta', 'art/sprites/dekey-report.json');
    }

    this.load.on('loaderror', function (file) {
      console.warn('[BrawlZ] sprite failed to load (' + file.key + ') — using the placeholder art.');
    });
  };

  ArenaScene.prototype.create = function () {
    var self = this;
    BrawlZ.scene = this;      // debug handle: BrawlZ.scene.combat.actors in the console

    this.physics.world.setBounds(24, 24, W - 48, H - 48);
    this.cameras.main.setBounds(0, 0, W, H);

    // ---- arena: walls, bushes and spawn points ------------------------
    this.map = new BrawlZ.ArenaMap(this);
    var edge = this.add.graphics().setDepth(1);
    edge.lineStyle(8, 0x4a3f7a, 1);
    edge.strokeRect(4, 4, W - 8, H - 8);

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

    var pSpawn = this.map.spawnPoint(0, 0);
    var eSpawn = this.map.spawnPoint(1, 0);
    var player = this.spawnFighter(playerDef, { x: pSpawn.x, y: pSpawn.y, team: 0, isPlayer: true });
    var enemy = this.spawnFighter(enemyDef, { x: eSpawn.x, y: eSpawn.y, team: 1, instanceId: 'bot_1' });

    this.playerController = new BrawlZ.PlayerController(this, player);
    this.controllers = [new BrawlZ.BotController(this, enemy)];

    this.fighterColliders = [{
      collider: this.physics.add.collider(player.sprite, enemy.sprite),
      pair: [player, enemy]
    }];

    // walls stop bodies and shots alike
    var self2 = this;
    this.map.attachCollisions(this.fighters, this.projectiles, function (projectile) {
      self2.retireProjectile(projectile);
    });

    this.hud.bind(player.actor, enemy.actor);
    this.player = player;

    // ---- camera ------------------------------------------------------
    this.cameras.main.startFollow(player.sprite, true, 0.1, 0.1);
    this.cameras.main.setZoom(1.05);

    // ---- fx layers ---------------------------------------------------
    this.fxGfx = this.add.graphics().setDepth(15);
    this.aimPreviewGfx = this.add.graphics().setDepth(6);

    this.events.on('shutdown', function () { self.combat = null; });
  };

  /**
   * Turns body-blocking on or off for one fighter. Used by leaping ultimates:
   * a dash that shoves its target along physically would push it out of the
   * blast it is about to trigger, so the jumper passes over enemies instead.
   */
  ArenaScene.prototype.setFighterCollisions = function (fighter, enabled) {
    (this.fighterColliders || []).forEach(function (entry) {
      if (entry.pair.indexOf(fighter) !== -1) entry.collider.active = enabled;
    });
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
      var hits = this.combat.resolveAoe(meta.owner, projectile.x, projectile.y, meta.aoeRadius, meta.damage, {
        knockback: meta.knockback,
        source: 'ultimate'
      });
      // The blast is measured from the impact point to each body's centre, so a
      // radius smaller than the body it just struck would miss its own target.
      // Whatever the projectile physically connected with always takes the hit.
      if (hits.indexOf(target) === -1) {
        this.combat.applyDamage(meta.owner, target, meta.damage, {
          knockback: meta.knockback,
          source: 'ultimate'
        });
      }
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
  /**
   * Shows where the shot will go while an aim stick is held — without it,
   * drag-to-aim is guesswork.
   */
  ArenaScene.prototype.showAimPreview = function (fighter, kind) {
    var a = fighter.actor;
    var g = this.aimPreviewGfx;
    var colour = Phaser.Display.Color.HexStringToColor(
      kind === 'ultimate' ? fighter.theme.trim : fighter.theme.accent
    ).color;

    var reach = kind === 'ultimate'
      ? (a.ultimate && a.ultimate.radius ? a.ultimate.radius * 2 : 320)
      : a.profile.reach;

    var x = fighter.sprite.x;
    var y = fighter.sprite.y;
    var tipX = x + Math.cos(a.aim) * reach;
    var tipY = y + Math.sin(a.aim) * reach;

    g.clear();
    g.lineStyle(6, colour, 0.35);
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(tipX, tipY);
    g.strokePath();

    // where it lands: the cone for a melee swing, the blast for everything else
    if (kind === 'attack' && a.rangeType === 'melee') {
      var half = (a.profile.arcDeg * Math.PI) / 180 / 2;
      g.fillStyle(colour, 0.18);
      g.slice(x, y, a.profile.reach, a.aim - half, a.aim + half, false);
      g.fillPath();
    } else {
      var r = kind === 'ultimate' ? (a.ultimate && a.ultimate.radius) || 160 : 26;
      g.lineStyle(3, colour, 0.5);
      g.strokeCircle(tipX, tipY, r);
    }
  };

  ArenaScene.prototype.clearAimPreview = function () {
    if (this.aimPreviewGfx) this.aimPreviewGfx.clear();
  };

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

    // hide anyone sitting in a bush more than two tiles away
    for (var h = 0; h < this.fighters.length; h++) {
      var f = this.fighters[h];
      if (f === this.player) continue;
      var hidden = this.map.isConcealed(f, this.player);
      f.setConcealed(hidden);
    }

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
  BrawlZ.VIEW_W = VIEW_W;
  BrawlZ.VIEW_H = VIEW_H;
})(typeof window !== 'undefined' ? window : globalThis);
