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
   * AimStick — drag to aim, release to fire, tap to auto-aim
   *
   * This is the control that makes the genre feel like itself: the shot goes
   * where you let go, and a quick tap means "just hit whoever is closest".
   * ================================================================== */
  function AimStick(zoneEl, thumbEl) {
    VirtualStick.call(this, zoneEl, thumbEl);
    this.pending = null;          // a completed gesture waiting to be consumed
    this.pressedAt = 0;
    this.travelled = 0;

    if (!zoneEl) return;
    var self = this;
    zoneEl.addEventListener('pointerdown', function () {
      self.pressedAt = performance.now();
      self.travelled = 0;
    });
  }
  AimStick.prototype = Object.create(VirtualStick.prototype);
  AimStick.prototype.constructor = AimStick;

  /**
   * The release IS the gesture, so it has to be captured here rather than in a
   * separate pointerup listener: the base class already listens for pointerup
   * and its reset() zeroes the vector, and listeners run in registration order.
   */
  AimStick.prototype.reset = function () {
    if (this.active) {
      var held = performance.now() - this.pressedAt;
      this.pending = {
        x: this.x,
        y: this.y,
        magnitude: Math.sqrt(this.x * this.x + this.y * this.y),
        tap: held < 220 && this.travelled < 0.25
      };
    }
    VirtualStick.prototype.reset.call(this);
  };

  AimStick.prototype._track = function (e) {
    VirtualStick.prototype._track.call(this, e);
    this.travelled = Math.max(this.travelled, Math.sqrt(this.x * this.x + this.y * this.y));
  };

  /** Returns the finished gesture once, then forgets it. */
  AimStick.prototype.consume = function () {
    var p = this.pending;
    this.pending = null;
    return p;
  };

  AimStick.prototype.aiming = function () {
    return this.active && Math.sqrt(this.x * this.x + this.y * this.y) > 0.18;
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
    this.attackStick = new AimStick(
      document.getElementById('attack-zone'),
      document.getElementById('attack-thumb')
    );
    this.ultStick = new AimStick(
      document.getElementById('ult-zone'),
      document.getElementById('ult-thumb')
    );
  }

  /** Points the fighter at the nearest enemy; false when the arena is empty. */
  PlayerController.prototype.autoAim = function () {
    var target = this.scene.nearestEnemy(this.fighter.actor);
    if (!target) return false;
    this.fighter.aimAt(target.x, target.y);
    return true;
  };

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

    // ---- aiming ----
    // An aim stick under the thumb wins; then the mouse; then movement
    // direction; and standing still with none of those, the nearest enemy.
    var aimingStick = this.attackStick.aiming() ? this.attackStick
      : (this.ultStick.aiming() ? this.ultStick : null);

    if (aimingStick) {
      f.aimTowards(Math.atan2(aimingStick.y, aimingStick.x));
    } else if (this.usingMouse) {
      var p = this.scene.input.activePointer;
      f.aimAt(p.worldX, p.worldY);
    } else if (Math.abs(dx) + Math.abs(dy) > 0.2) {
      f.aimTowards(Math.atan2(dy, dx));
    } else {
      this.autoAim();
    }

    // ---- aim preview while a stick is held ----
    if (this.attackStick.aiming()) this.scene.showAimPreview(f, 'attack');
    else if (this.ultStick.aiming()) this.scene.showAimPreview(f, 'ultimate');
    else this.scene.clearAimPreview();

    // ---- firing ----
    // The stick is already released by now, so the aim must come from the
    // gesture itself — otherwise it snaps back to the mouse before firing.
    var shot = this.attackStick.consume();
    if (shot) {
      if (shot.tap || shot.magnitude < 0.18) this.autoAim();
      else f.aimTowards(Math.atan2(shot.y, shot.x));
      f.attack();
    }

    var ultGesture = this.ultStick.consume();
    if (ultGesture) {
      if (ultGesture.tap || ultGesture.magnitude < 0.18) this.autoAim();
      else f.aimTowards(Math.atan2(ultGesture.y, ultGesture.x));
      f.castUltimate();
    }

    // Keyboard and mouse keep the simple hold-to-fire behaviour.
    if (this.attackHeld || k.attack.isDown) f.attack();

    var ultKey = Phaser.Input.Keyboard.JustDown(k.ult) || Phaser.Input.Keyboard.JustDown(k.ult2);
    if (ultKey) f.castUltimate();
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

    // stuck detection
    this.lastX = fighter.sprite.x;
    this.lastY = fighter.sprite.y;
    this.stuckFor = 0;
    this.detourTimer = 0;
    this.detourDir = { x: 0, y: 0 };
    this.repathIn = 0;
    this.waypoint = null;
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

    var map = this.scene.map;
    var hasSight = !map || !map.blocksLine(a.x, a.y, target.x, target.y);

    var reach = a.profile.reach;
    var preferred = a.rangeType === 'ranged' ? reach * 0.6 : reach * 0.7;
    var nx = dx / dist;
    var ny = dy / dist;
    var px = -ny * this.strafeDir;      // perpendicular = strafe
    var py = nx * this.strafeDir;

    // Out of sight means there is cover between us, so walk the path around it
    // instead of pressing into the wall.
    this.repathIn -= dt;
    if (map && !hasSight && this.repathIn <= 0) {
      this.waypoint = map.nextWaypoint(a.x, a.y, target.x, target.y);
      this.repathIn = 0.3;
    }
    if (hasSight) this.waypoint = null;

    var moveX, moveY;
    if (!hasSight && this.waypoint) {
      var wdx = this.waypoint.x - a.x;
      var wdy = this.waypoint.y - a.y;
      var wlen = Math.hypot(wdx, wdy) || 1;
      moveX = wdx / wlen;
      moveY = wdy / wlen;
      if (wlen < 24) this.repathIn = 0;   // arrived: pick the next tile now
    } else if (!hasSight) {
      moveX = nx;                        // no route found: press on regardless
      moveY = ny;
    } else if (dist > preferred * 1.15) {
      moveX = nx + px * 0.25;
      moveY = ny + py * 0.25;
    } else if (dist < preferred * 0.65) {
      moveX = -nx + px * 0.4;
      moveY = -ny + py * 0.4;
    } else {
      moveX = px;
      moveY = py;
    }

    // ---- navigation: don't walk into the cover ----
    if (this.detourTimer > 0) {
      this.detourTimer -= dt;
      moveX = this.detourDir.x;
      moveY = this.detourDir.y;
    } else if (map && (hasSight || !this.waypoint)) {
      var steered = map.clearDirection(a.x, a.y, moveX, moveY);
      moveX = steered.x;
      moveY = steered.y;
    }

    // ---- stuck detection: commit to a sideways detour for a moment ----
    var moved = Math.hypot(f.sprite.x - this.lastX, f.sprite.y - this.lastY);
    this.lastX = f.sprite.x;
    this.lastY = f.sprite.y;
    this.stuckFor = moved < 0.6 ? this.stuckFor + dt : 0;
    if (this.stuckFor > 0.5 && this.detourTimer <= 0) {
      var side = Math.random() < 0.5 ? 1 : -1;
      this.detourDir = { x: -ny * side, y: nx * side };
      this.detourTimer = 0.7;
      this.stuckFor = 0;
    }

    f.move(moveX, moveY);

    // Ultimate first — it is the big damage, so spend it when it can land.
    // Melee ults close ~345px of that gap themselves, so the bot may cast from
    // further out than its basic-attack reach.
    var ultRange = a.rangeType === 'ranged' ? 460 : (a.ultimate ? a.ultimate.radius + 330 : 300);
    if (a.superReady() && hasSight && dist < ultRange && Math.random() < 0.12) {
      if (f.castUltimate()) return;
    }

    this.reaction -= dt;
    if (dist <= reach * 0.95 && hasSight && this.reaction <= 0) {
      if (f.attack()) this.reaction = 0.08 + Math.random() * 0.12 * (2 - this.aggression);
    }
  };

  BrawlZ.VirtualStick = VirtualStick;
  BrawlZ.AimStick = AimStick;
  BrawlZ.PlayerController = PlayerController;
  BrawlZ.BotController = BotController;
})(typeof window !== 'undefined' ? window : globalThis);
