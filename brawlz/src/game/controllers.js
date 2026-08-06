/**
 * Controllers — what drives a Fighter.
 *
 * PlayerController: keyboard + mouse on desktop, virtual stick + two buttons on
 * touch. UltimateAI: a deliberately simple bot, enough to make the loop (kill /
 * die / respawn / voice lines) play out on its own.
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  /* ================================================================== *
   * Virtual stick (touch)
   * ================================================================== */
  function VirtualStick(zoneEl, thumbEl) {
    this.zone = zoneEl;
    this.thumb = thumbEl;
    this.x = 0;
    this.y = 0;
    this.active = false;
    this.pointerId = null;
    this.originX = 0;
    this.originY = 0;
    this.maxRadius = 52;

    if (!zoneEl) return;
    var self = this;

    zoneEl.addEventListener('pointerdown', function (e) {
      self.active = true;
      self.pointerId = e.pointerId;
      var rect = zoneEl.getBoundingClientRect();
      self.originX = rect.left + rect.width / 2;
      self.originY = rect.top + rect.height / 2;
      zoneEl.setPointerCapture(e.pointerId);
      self._track(e);
      e.preventDefault();
    });

    zoneEl.addEventListener('pointermove', function (e) {
      if (!self.active || e.pointerId !== self.pointerId) return;
      self._track(e);
      e.preventDefault();
    });

    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
      zoneEl.addEventListener(evt, function (e) {
        if (e.pointerId !== self.pointerId) return;
        self.reset();
      });
    });
  }

  VirtualStick.prototype._track = function (e) {
    var dx = e.clientX - this.originX;
    var dy = e.clientY - this.originY;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var clamped = Math.min(len, this.maxRadius);
    this.x = (dx / len) * (clamped / this.maxRadius);
    this.y = (dy / len) * (clamped / this.maxRadius);
    if (this.thumb) {
      this.thumb.style.transform =
        'translate(' + (dx / len) * clamped + 'px,' + (dy / len) * clamped + 'px)';
    }
  };

  VirtualStick.prototype.reset = function () {
    this.active = false;
    this.pointerId = null;
    this.x = 0;
    this.y = 0;
    if (this.thumb) this.thumb.style.transform = 'translate(0,0)';
  };

  /* ================================================================== *
   * PlayerController
   * ================================================================== */
  function PlayerController(scene, fighter) {
    this.scene = scene;
    this.fighter = fighter;
    this.usingMouse = false;
    this.ultQueued = false;
    this.attackHeld = false;

    var kb = scene.input.keyboard;
    this.keys = kb.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
      up2: Phaser.Input.Keyboard.KeyCodes.UP,
      down2: Phaser.Input.Keyboard.KeyCodes.DOWN,
      left2: Phaser.Input.Keyboard.KeyCodes.LEFT,
      right2: Phaser.Input.Keyboard.KeyCodes.RIGHT,
      attack: Phaser.Input.Keyboard.KeyCodes.J,
      ult: Phaser.Input.Keyboard.KeyCodes.K,
      ult2: Phaser.Input.Keyboard.KeyCodes.SPACE
    });

    var self = this;
    scene.input.on('pointermove', function (p) {
      if (p.pointerType !== 'touch') self.usingMouse = true;
    });
    scene.input.on('pointerdown', function (p) {
      if (p.pointerType !== 'touch') self.attackHeld = true;
    });
    scene.input.on('pointerup', function (p) {
      if (p.pointerType !== 'touch') self.attackHeld = false;
    });

    this.stick = new VirtualStick(
      document.getElementById('stick-zone'),
      document.getElementById('stick-thumb')
    );
    this._bindButton('btn-attack', function (down) { self.attackHeld = down; });
    this._bindButton('btn-ult', function (down) { if (down) self.ultQueued = true; });
  }

  PlayerController.prototype._bindButton = function (id, cb) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('pointerdown', function (e) { cb(true); e.preventDefault(); });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
      el.addEventListener(evt, function () { cb(false); });
    });
  };

  PlayerController.prototype.update = function () {
    var f = this.fighter;
    var k = this.keys;

    var dx = (k.right.isDown || k.right2.isDown ? 1 : 0) - (k.left.isDown || k.left2.isDown ? 1 : 0);
    var dy = (k.down.isDown || k.down2.isDown ? 1 : 0) - (k.up.isDown || k.up2.isDown ? 1 : 0);
    if (this.stick.active) {
      dx = this.stick.x;
      dy = this.stick.y;
    }
    f.move(dx, dy);

    // Aim: mouse if we have one, otherwise the stick direction, otherwise the
    // nearest enemy so touch players still land their hits.
    if (this.usingMouse) {
      var p = this.scene.input.activePointer;
      f.aimAt(p.worldX, p.worldY);
    } else if (Math.abs(dx) + Math.abs(dy) > 0.2) {
      f.aimTowards(Math.atan2(dy, dx));
    } else {
      var target = this.scene.nearestEnemy(f.actor);
      if (target) f.aimAt(target.x, target.y);
    }

    // Hold to swing — the cooldown in the core gates the actual rate.
    if (this.attackHeld || k.attack.isDown) f.attack();

    var ultKey = Phaser.Input.Keyboard.JustDown(k.ult) || Phaser.Input.Keyboard.JustDown(k.ult2);
    if (ultKey || this.ultQueued) {
      this.ultQueued = false;
      f.castUltimate();
    }
  };

  /* ================================================================== *
   * BotController
   * ================================================================== */
  function BotController(scene, fighter, options) {
    options = options || {};
    this.scene = scene;
    this.fighter = fighter;
    this.aggression = options.aggression == null ? 1 : options.aggression;
    this.reaction = 0;
    this.strafeDir = Math.random() < 0.5 ? -1 : 1;
    this.strafeTimer = 0;
  }

  BotController.prototype.update = function (dt) {
    var f = this.fighter;
    var a = f.actor;
    if (!a.alive) return;

    var target = this.scene.nearestEnemy(a);
    if (!target) { f.move(0, 0); return; }

    var dx = target.x - a.x;
    var dy = target.y - a.y;
    var dist = Math.sqrt(dx * dx + dy * dy) || 1;
    f.aimTowards(Math.atan2(dy, dx));

    this.strafeTimer -= dt;
    if (this.strafeTimer <= 0) {
      this.strafeTimer = 1.2 + Math.random();
      this.strafeDir *= -1;
    }

    var reach = a.profile.reach;
    var preferred = a.rangeType === 'ranged' ? reach * 0.6 : reach * 0.7;
    var nx = dx / dist;
    var ny = dy / dist;
    var px = -ny * this.strafeDir;      // perpendicular = strafe
    var py = nx * this.strafeDir;

    var moveX, moveY;
    if (dist > preferred * 1.15) {
      moveX = nx + px * 0.25;
      moveY = ny + py * 0.25;
    } else if (dist < preferred * 0.65) {
      moveX = -nx + px * 0.4;
      moveY = -ny + py * 0.4;
    } else {
      moveX = px;
      moveY = py;
    }
    f.move(moveX, moveY);

    // Ultimate first — it is the big damage, so spend it when it can land.
    // Melee ults close ~345px of that gap themselves, so the bot may cast from
    // further out than its basic-attack reach.
    var ultRange = a.rangeType === 'ranged' ? 460 : (a.ultimate ? a.ultimate.radius + 330 : 300);
    if (a.ultimateCooldown.ready() && dist < ultRange && Math.random() < 0.12) {
      if (f.castUltimate()) return;
    }

    this.reaction -= dt;
    if (dist <= reach * 0.95 && this.reaction <= 0) {
      if (f.attack()) this.reaction = 0.08 + Math.random() * 0.12 * (2 - this.aggression);
    }
  };

  BrawlZ.VirtualStick = VirtualStick;
  BrawlZ.PlayerController = PlayerController;
  BrawlZ.BotController = BotController;
})(typeof window !== 'undefined' ? window : globalThis);
