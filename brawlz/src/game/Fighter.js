/**
 * Fighter — the Phaser presentation of one CombatActor.
 *
 * The actor owns the rules (hp, cooldowns, state); the fighter owns the body,
 * the health bar, the speech bubble and the animation timing. Every frame the
 * fighter copies its transform into the actor so the core can hit-test.
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  var BODY_RADIUS = 30;
  var DEFAULT_DRAG = 0.01;      // damping factor: knockback bleeds off in ~0.3s

  function Fighter(scene, actor) {
    this.scene = scene;
    this.system = scene.combat;
    this.actor = actor;
    this.theme = actor.def.theme || { body: '#8899aa', accent: '#ffffff', trim: '#dddddd' };

    // Real artwork when the character has it, procedural placeholder otherwise.
    var artKey = 'sprite_' + actor.def.id;
    this.hasArt = scene.textures.exists(artKey);
    var texKey = artKey;
    if (!this.hasArt) {
      texKey = 'fighter_' + actor.def.id;
      BrawlZ.Textures.makeFighterTexture(scene, texKey, this.theme, actor.rangeType === 'ranged');
    }

    this.sprite = scene.physics.add.image(actor.x, actor.y, texKey);

    // Sprites are exported at their final on-screen size, so the game object
    // scale stays 1 and the arcade circle stays in plain texture pixels.
    var w = this.sprite.width;
    var h = this.sprite.height;
    var footY = this.hasArt ? h * 0.62 : h / 2 + 4;
    this.sprite.setCircle(BODY_RADIUS, w / 2 - BODY_RADIUS, footY - BODY_RADIUS);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDamping(true);
    this.sprite.setDrag(DEFAULT_DRAG);
    this.sprite.setMaxVelocity(1400);
    this.sprite.setDepth(10);
    this.sprite.fighter = this;

    // Overlay offsets follow the artwork's height instead of a fixed constant,
    // so a taller sprite doesn't collide with its own health bar.
    this.topOffset = h / 2;

    this.aimGfx = scene.add.graphics().setDepth(9);
    this.barGfx = scene.add.graphics().setDepth(21);

    this.nameText = scene.add.text(actor.x, actor.y - this.topOffset - 24, actor.displayName, {
      fontFamily: BrawlZ.FONT,
      fontSize: '15px',
      color: actor.isPlayer ? '#7cf3c2' : '#ff9c9c',
      rtl: true
    }).setOrigin(0.5).setDepth(22);

    this.bubble = scene.add.text(actor.x, actor.y - this.topOffset - 34, '', {
      fontFamily: BrawlZ.FONT,
      fontSize: '17px',
      color: '#ffffff',
      backgroundColor: 'rgba(18,14,30,0.92)',
      padding: { x: 12, y: 8 },
      align: 'right',
      rtl: true,
      wordWrap: { width: 300 }
    }).setOrigin(0.5, 1).setDepth(31).setVisible(false);

    this.knockbackTimer = 0;
    this.bubbleEvent = null;
    this.dashing = false;
  }

  /* ---------------- movement ---------------- */

  Fighter.prototype.move = function (dirX, dirY) {
    if (!this.actor.canMove() || this.dashing) return;
    if (this.knockbackTimer > 0) return;      // let the hit push land first

    var len = Math.sqrt(dirX * dirX + dirY * dirY);
    if (len < 0.15) {
      this.sprite.setVelocity(0, 0);
      return;
    }
    var speed = this.actor.moveSpeed;
    this.sprite.setVelocity((dirX / len) * speed, (dirY / len) * speed);
  };

  Fighter.prototype.aimAt = function (x, y) {
    this.actor.aim = Math.atan2(y - this.sprite.y, x - this.sprite.x);
  };

  Fighter.prototype.aimTowards = function (angle) {
    this.actor.aim = angle;
  };

  /**
   * Fixed-distance lunge used by gap-closing ultimates. Damping is switched off
   * for the duration, otherwise drag eats most of the travel and the dash lands
   * far short of its advertised range.
   */
  Fighter.prototype.dash = function (angle, speed, durationMs, onLand) {
    var self = this;
    this.dashing = true;
    if (this.scene.setFighterCollisions) this.scene.setFighterCollisions(this, false);
    this.sprite.setDamping(false);
    this.sprite.setDrag(0, 0);
    this.sprite.setVelocity(Math.cos(angle) * speed, Math.sin(angle) * speed);

    this.scene.time.delayedCall(durationMs, function () {
      self.dashing = false;
      if (self.scene.setFighterCollisions) self.scene.setFighterCollisions(self, true);
      self.sprite.setVelocity(0, 0);
      self.sprite.setDamping(true);
      self.sprite.setDrag(DEFAULT_DRAG);
      self.sprite.setScale(1);
      if (onLand) onLand();
    });
  };

  Fighter.prototype.knockback = function (angle, force) {
    if (!force) return;
    this.knockbackTimer = 0.28;
    this.sprite.setVelocity(Math.cos(angle) * force, Math.sin(angle) * force);
  };

  /* ---------------- basic attack ---------------- */

  Fighter.prototype.attack = function () {
    var plan = this.system.requestAttack(this.actor);
    if (!plan) return false;

    var self = this;
    this.punchAnim();

    this.scene.time.delayedCall(plan.windup * 1000, function () {
      if (!self.actor.alive) return;
      if (plan.kind === 'melee') {
        self.scene.showSwing(self, plan);
        self.system.resolveMelee(self.actor, plan);
      } else {
        self.scene.spawnProjectile({
          owner: self.actor,
          x: self.sprite.x + Math.cos(plan.aim) * 34,
          y: self.sprite.y + Math.sin(plan.aim) * 34,
          angle: plan.aim,
          speed: plan.projectileSpeed,
          radius: plan.projectileRadius,
          damage: plan.damage,
          knockback: plan.knockback,
          range: plan.reach,
          color: self.theme.accent
        });
      }
    });
    return true;
  };

  Fighter.prototype.punchAnim = function () {
    var self = this;
    this.scene.tweens.add({
      targets: this.sprite,
      scaleX: 1.18,
      scaleY: 0.86,
      duration: 90,
      yoyo: true,
      onComplete: function () { self.sprite.setScale(1); }
    });
  };

  /* ---------------- ultimate ---------------- */

  Fighter.prototype.castUltimate = function () {
    var payload = this.system.requestUltimate(this.actor);
    if (!payload) return false;

    var name = this.actor.ultimate.name;
    var impl = BrawlZ.Ultimates[name] || BrawlZ.Ultimates._default;
    impl(this.scene, this, payload);
    return true;
  };

  /* ---------------- feedback ---------------- */

  Fighter.prototype.say = function (text) {
    this.bubble.setText(text).setVisible(true).setAlpha(1);
    if (this.bubbleEvent) this.bubbleEvent.remove(false);
    var self = this;
    this.bubbleEvent = this.scene.time.delayedCall(2800, function () {
      self.scene.tweens.add({
        targets: self.bubble,
        alpha: 0,
        duration: 350,
        onComplete: function () { self.bubble.setVisible(false); }
      });
    });
  };

  Fighter.prototype.flash = function (color) {
    var self = this;
    this.sprite.setTintFill(color == null ? 0xffffff : color);
    this.scene.time.delayedCall(70, function () { self.sprite.clearTint(); });
  };

  Fighter.prototype.onDeath = function () {
    var self = this;
    this.sprite.setVelocity(0, 0);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0.15,
      angle: 90,
      scale: 0.75,
      duration: 400
    });
    this.scene.time.delayedCall(0, function () { self.aimGfx.clear(); });
  };

  Fighter.prototype.onRespawn = function () {
    this.sprite.setPosition(this.actor.spawnX, this.actor.spawnY);
    this.sprite.setVelocity(0, 0);
    this.sprite.setAlpha(1).setAngle(0).setScale(1);
    this.knockbackTimer = 0;
    this.dashing = false;
  };

  /* ---------------- per-frame ---------------- */

  Fighter.prototype.update = function (dt) {
    var a = this.actor;

    // push the rendered transform back into the rules layer
    a.x = this.sprite.x;
    a.y = this.sprite.y;

    if (this.knockbackTimer > 0) this.knockbackTimer -= dt;

    if (!a.alive) {
      this.barGfx.clear();
      this.aimGfx.clear();
      this.nameText.setVisible(false);
      this.bubble.setPosition(this.sprite.x, this.sprite.y - this.topOffset);
      return;
    }

    this.nameText.setVisible(true).setPosition(this.sprite.x, this.sprite.y - this.topOffset - 24);
    this.bubble.setPosition(this.sprite.x, this.sprite.y - this.topOffset - 34);

    // Artwork is drawn facing right; mirror it when aiming left.
    if (this.hasArt) this.sprite.setFlipX(Math.abs(a.aim) > Math.PI / 2);

    // spawn protection shimmer
    this.sprite.setAlpha(a.invulnerableFor > 0 ? 0.55 + 0.35 * Math.sin(this.scene.time.now / 60) : 1);

    // facing arrow
    this.aimGfx.clear();
    this.aimGfx.lineStyle(4, Phaser.Display.Color.HexStringToColor(this.theme.accent).color, 0.75);
    this.aimGfx.beginPath();
    this.aimGfx.moveTo(this.sprite.x + Math.cos(a.aim) * 32, this.sprite.y + Math.sin(a.aim) * 32);
    this.aimGfx.lineTo(this.sprite.x + Math.cos(a.aim) * 52, this.sprite.y + Math.sin(a.aim) * 52);
    this.aimGfx.strokePath();

    // health bar
    var w = 72, h = 9, x = this.sprite.x - w / 2, y = this.sprite.y - this.topOffset - 10;
    this.barGfx.clear();
    this.barGfx.fillStyle(0x000000, 0.55);
    this.barGfx.fillRoundedRect(x - 2, y - 2, w + 4, h + 4, 5);
    this.barGfx.fillStyle(0x3a3450, 1);
    this.barGfx.fillRoundedRect(x, y, w, h, 4);
    var ratio = a.hpRatio();
    var color = ratio > 0.5 ? 0x54e08a : ratio > 0.25 ? 0xf2c14e : 0xef4a5b;
    this.barGfx.fillStyle(color, 1);
    if (ratio > 0) this.barGfx.fillRoundedRect(x, y, Math.max(4, w * ratio), h, 4);
  };

  Fighter.prototype.destroy = function () {
    this.sprite.destroy();
    this.barGfx.destroy();
    this.aimGfx.destroy();
    this.nameText.destroy();
    this.bubble.destroy();
  };

  BrawlZ.Fighter = Fighter;
  BrawlZ.BODY_RADIUS = BODY_RADIUS;
})(typeof window !== 'undefined' ? window : globalThis);
