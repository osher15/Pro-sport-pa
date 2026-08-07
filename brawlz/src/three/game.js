/**
 * Game3D — the 3D renderer and match loop.
 *
 * The rules all live elsewhere: src/core/combat.js decides damage, ammo, super
 * and death; src/core/hazards.js decides when a meteor falls. This file moves
 * bodies, draws things, and feeds positions back into the core every frame.
 */
import * as THREE from '../../vendor/three/three.module.min.js';
import { Grid } from './grid.js';
import { buildArena, buildLights, loadTileTextures } from './arena.js';
import { Rig } from './rig.js';
import { Stick, Keyboard } from './input.js';
import { Fx } from './fx.js';
import { HazardView } from './hazards.js';
import { HazardDirector } from '../core/hazards.js';
import { Match } from '../core/match.js';
import { equipCore } from '../core/cores.js';
import { runUltimate } from './ultimates.js';

/**
 * A fighter's voice, derived from how heavy it is. The sumo's punch lands an
 * octave below the shark's torpedo without either needing its own sound.
 */
function pitchFor(def) {
  const hp = (def.stats && def.stats.hp) || 2000;
  const t = Math.min(1, Math.max(0, (hp - 1500) / 1600));
  return 1.28 - t * 0.52;
}

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

const BODY_RADIUS = 26;
const ACCEL = 1400;          // world units/s^2 — full speed in about 0.14s
const FRICTION = 9;
const PROJECTILE_POOL = 40;

/**
 * Camera sits behind and above the player at ~43 degrees off the horizontal.
 *
 * Steeper than this and you are looking at the tops of everyone's heads — the
 * faces, and therefore the characters, disappear. Much flatter and the wall
 * blocks hide whatever is behind them.
 */
const CAM_OFFSET = new THREE.Vector3(0, 680, 720);
const CAM_LAG = 6.5;
/**
 * How far the shot may leave the arena. Negative on purpose: the look point
 * stops *inside* the edge, so a fighter fighting in a corner still sees arena
 * around them instead of half a screen of empty sky.
 */
const CAM_MARGIN = -140;

export class Game3D {
  constructor(opts) {
    const { canvas, roster, playerId, enemyId, arena, hud, cores, playerCoreId } = opts;

    this.canvas = canvas;
    this.hud = hud || null;
    this.arena = arena;
    this.audio = opts.audio || { play() { return false; } };
    this.cores = cores || [];
    this.playerCoreId = playerCoreId || 'core_none';
    this.onMatchEnd = opts.onMatchEnd || null;
    this.grid = new Grid(arena.grid, arena.tile || 80);
    this.roster = roster;

    this.playerDef = roster.find((c) => c.id === playerId) || roster[0];
    this.enemyDef = roster.find((c) => c.id === enemyId) ||
      roster.find((c) => c.id !== this.playerDef.id) || roster[0];

    this.clock = new THREE.Clock();
    this.running = false;
    this._frame = null;

    this.initRenderer();
    this.initWorld();
    this.initFighters();
    this.initCores();
    this.initProjectiles();
    this.initHazards();
    this.initMatch();
    this.initInput();
    this.bindCombatEvents();

    this.onResize = this.onResize.bind(this);
    window.addEventListener('resize', this.onResize);
    this.onResize();
  }

  /* ------------------------------------------------------------------ */

  initRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas, antialias: true, powerPreference: 'high-performance'
    });
    // Capped: a 3x-DPR phone renders nine times the pixels for no visible gain
    // and drops straight off 60fps.
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const pal = this.arena.palette || {};
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(pal.sky || '#171232');
    this.scene.fog = new THREE.Fog(new THREE.Color(pal.fog || pal.sky || '#171232'), 1800, 3400);

    this.camera = new THREE.PerspectiveCamera(32, 1, 50, 5000);
    this.camDesired = new THREE.Vector3();
    this.camTarget = new THREE.Vector3();
    this.camBase = new THREE.Vector3();
  }

  initWorld() {
    this.textures = loadTileTextures(this.arena.art);
    buildArena(this.scene, this.grid, {
      palette: this.arena.palette, textures: this.textures
    });
    buildLights(this.scene, this.grid, this.arena.palette);
    this.fx = new Fx(this.scene);
  }

  initFighters() {
    const BrawlZ = window.BrawlZ;
    this.system = new BrawlZ.CombatSystem();

    const spawnA = this.grid.spawns[0][0] || { x: 200, y: 200 };
    const spawnB = this.grid.spawns[1][this.grid.spawns[1].length - 1] ||
      { x: this.grid.width - 200, y: this.grid.depth - 200 };

    this.player = this.makeFighter(this.playerDef, {
      team: 0, isPlayer: true, x: spawnA.x, y: spawnA.y, ring: 0x35d6ff
    });
    this.enemy = this.makeFighter(this.enemyDef, {
      team: 1, isPlayer: false, x: spawnB.x, y: spawnB.y, ring: 0xff4d5e
    });
    this.fighters = [this.player, this.enemy];
    this.byActor = new Map(this.fighters.map((f) => [f.actor, f]));

    this.voice = new BrawlZ.VoiceDirector(this.system, {
      onLine: (line) => { if (this.hud) this.hud.say(line); }
    });
  }

  makeFighter(def, opts) {
    const actor = new window.BrawlZ.CombatActor(def, {
      team: opts.team, isPlayer: opts.isPlayer, x: opts.x, y: opts.y,
      instanceId: def.id + ':' + opts.team
    });
    this.system.add(actor);

    // Fighters are drawn a little larger than their hitbox. The genre does this
    // on purpose: the body you aim at should be easy to see, and the body that
    // collides should be forgiving.
    const rig = new Rig(def);
    rig.root.scale.setScalar(1.45);
    rig.setRingColor(opts.ring);
    rig.setPosition(opts.x, opts.y);
    this.scene.add(rig.root);

    return {
      def, actor, rig,
      pitch: pitchFor(def),
      vx: 0, vy: 0, speed: 0,
      desired: null,
      waypoint: null, repathIn: 0,
      dash: null,
      fireCooldown: 0,
      pendingShot: null
    };
  }

  /**
   * Equips the player's chosen Core, and gives the bot a random one so the
   * same character does not fight the same way twice in a row.
   */
  initCores() {
    const byId = new Map(this.cores.map((c) => [c.id, c]));
    this.playerCore = byId.get(this.playerCoreId) || null;
    if (this.playerCore) equipCore(this.player.actor, this.playerCore);

    const pickable = this.cores.filter((c) => c.id !== 'core_none');
    this.enemyCore = pickable.length
      ? pickable[Math.floor(Math.random() * pickable.length)] : null;
    if (this.enemyCore) equipCore(this.enemy.actor, this.enemyCore);
  }

  initMatch() {
    this.match = new Match(this.system, this.arena.match || {}, {
      onEvent: (name, payload) => {
        if (this.hud) this.hud.matchEvent(name, payload);

        if (name === 'countdown') this.audio.play('countdown');
        else if (name === 'start') this.audio.play('go');
        else if (name === 'score') this.audio.play('score');
        else if (name === 'end') {
          this.audio.play(payload.winner === 0 ? 'win' : 'lose');
          this.hideAimLine();
          if (this.onMatchEnd) this.onMatchEnd(payload);
        }
      }
    });
  }

  initProjectiles() {
    this.projectiles = [];
    this.projectilePool = [];
    const geo = new THREE.SphereGeometry(1, 10, 8);
    for (let i = 0; i < PROJECTILE_POOL; i++) {
      const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      mesh.visible = false;
      this.scene.add(mesh);
      this.projectilePool.push(mesh);
    }
    this._proj = 0;
  }

  initHazards() {
    this.hazardView = new HazardView(this.scene, this.fx);

    const SOUND = {
      'meteor-telegraph': ['warning', {}],
      'meteor-impact': ['explosion', { size: 1.2 }],
      'drop-land': ['dropLand', {}],
      'drop-collect': ['pickup', {}]
    };

    this.hazards = new HazardDirector(this.system, this.grid, this.arena.hazards || [], {
      onEvent: (name, payload) => {
        this.hazardView.handle(name, payload);
        const cue = SOUND[name];
        if (cue) this.audio.play(cue[0], cue[1]);
      }
    });
  }

  initInput() {
    this.keys = new Keyboard();

    const moveZone = document.getElementById('move-zone');
    const moveKnob = document.getElementById('move-knob');
    this.moveStick = moveZone && moveKnob
      ? new Stick(moveZone, moveKnob, { radius: 54 }) : null;

    const aimZone = document.getElementById('aim-zone');
    const aimKnob = document.getElementById('aim-knob');
    this.aimStick = aimZone && aimKnob ? new Stick(aimZone, aimKnob, {
      radius: 54,
      // Drag to aim, release to fire; a tap with no drag auto-aims instead.
      onRelease: (gesture) => {
        if (!this.match.live) return;
        if (gesture.magnitude > 0.22) {
          this.fireAttack(this.player, Math.atan2(gesture.y, gesture.x));
        } else {
          this.autoFire(this.player);
        }
      }
    }) : null;

    const ultBtn = document.getElementById('ult-button');
    if (ultBtn) {
      this._onUlt = (e) => {
        e.preventDefault();
        if (this.match.live) this.castUltimate(this.player);
      };
      ultBtn.addEventListener('pointerdown', this._onUlt);
      this._ultBtn = ultBtn;
    }
  }

  bindCombatEvents() {
    this.system.on('damage', (e) => {
      const f = this.byActor.get(e.target);
      if (!f) return;
      if (e.knockback) {
        f.vx += Math.cos(e.angle) * e.knockback;
        f.vy += Math.sin(e.angle) * e.knockback;
      }
      // A burn ticks sixty times a second. Flashing and sparking on each tick
      // would bury the feedback for the hits that actually matter.
      if (e.silent) return;

      f.rig.play('hurt', 0.18);
      f.rig.flash(0.16);
      this.fx.sparkBurst(e.target.x, e.target.y, 0xff8a8a, 5, 55);
      if (e.target === this.player.actor) {
        this.fx.shake(0.18, 10);
        this.audio.play('hurt');
      } else {
        this.audio.play('hit', { pitch: f.pitch });
      }
    });

    this.system.on('death', (e) => {
      const f = this.byActor.get(e.actor);
      if (!f) return;
      this.fx.shockwave(e.actor.x, e.actor.y, 90, 0xffffff, 0.5);
      this.fx.sparkBurst(e.actor.x, e.actor.y, 0xffffff, 7, 90);
      this.audio.play('death');
      f.vx = f.vy = 0;
      f.dash = null;
    });

    this.system.on('spawn', (e) => {
      const f = this.byActor.get(e.actor);
      if (!f || e.initial) return;
      f.vx = f.vy = 0;
      f.rig.setPosition(e.actor.x, e.actor.y);
      this.audio.play('respawn');
    });

    // Only the player's reload ticks: the bot's would be a metronome you can
    // never do anything about.
    this.system.on('reload', (e) => {
      if (e.actor === this.player.actor) this.audio.play('reload');
    });
  }

  /* ------------------------------------------------------------------ */

  onResize() {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    // A phone in portrait sees a narrow slice; widen the shot so the arena does
    // not shrink to a keyhole.
    this.camera.fov = h > w ? 44 : 32;
    this.camera.updateProjectionMatrix();
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.clock.start();
    const tick = () => {
      if (!this.running) return;
      this._frame = requestAnimationFrame(tick);
      this.update(Math.min(this.clock.getDelta(), 1 / 20));
      this.renderer.render(this.scene, this.camera);
    };
    // Snap the camera before the first frame so the match does not open on a
    // swoop in from nowhere.
    this.updateCamera(1000);
    this._frame = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    if (this._frame) cancelAnimationFrame(this._frame);
  }

  /* ------------------------------------------------------------------ */

  update(dt) {
    this.match.update(dt);

    // The world keeps animating during the countdown and after the bell —
    // fighters breathe, hazards settle — but nobody can act. A frozen frame
    // reads as a crash; a live scene you cannot steer reads as a pause.
    const live = this.match.live;

    this.system.update(dt);
    if (live) this.hazards.update(dt);

    if (live) {
      this.drivePlayer(dt);
      this.driveBot(dt);
    } else {
      this.player.desired = null;
      this.enemy.desired = null;
      if (this.player.aiming) { this.player.aiming = false; this.hideAimLine(); }
    }

    for (const f of this.fighters) {
      this.tickPendingShot(f, dt);
      this.integrate(f, dt);
    }

    this.updateProjectiles(dt);
    this.hazardView.update(dt);
    this.fx.update(dt);

    // Concealment is symmetric in effect but asymmetric in maths: you are
    // hidden from whoever is far away, so each fighter is tested against the
    // other's eyes. The Shadow Core adds a second way to be hidden that owes
    // nothing to the map.
    const p = this.player, e = this.enemy;
    p.hidden = !!p.actor.vanished ||
      this.grid.isConcealed(p.actor.x, p.actor.y, e.actor.x, e.actor.y);
    e.hidden = !!e.actor.vanished ||
      this.grid.isConcealed(e.actor.x, e.actor.y, p.actor.x, p.actor.y);
    p.rig.setConcealed(p.hidden);
    e.rig.setConcealed(e.hidden);

    this.updateCamera(dt);
    if (this.hud) this.hud.sync(this.player.actor, this.enemy.actor, this.match);
  }

  /* ---------------- player ---------------- */

  drivePlayer(dt) {
    const f = this.player;

    if (this.moveStick && this.moveStick.active && this.moveStick.magnitude > 0.12) {
      f.desired = { x: this.moveStick.x, y: this.moveStick.y, magnitude: this.moveStick.magnitude };
    } else {
      f.desired = this.keys.vector();
    }

    // Live aim preview while the aim stick is held.
    if (this.aimStick && this.aimStick.active && this.aimStick.magnitude > 0.22) {
      f.actor.aim = Math.atan2(this.aimStick.y, this.aimStick.x);
      f.aiming = true;
      this.showAimLine(f);
    } else if (f.aiming) {
      f.aiming = false;
      this.hideAimLine();
    }

    if (this.keys.pressed('KeyJ') || this.keys.pressed('Space')) this.autoFire(f);
    if (this.keys.pressed('KeyK')) this.castUltimate(f);
  }

  /* ---------------- bot ---------------- */

  /**
   * Walks a BFS path toward the player, holds fire without line of sight, and
   * spends its super the moment it has one and a target in range.
   */
  driveBot(dt) {
    const f = this.enemy;
    const target = this.player.actor;
    if (!f.actor.alive || !target.alive) { f.desired = null; return; }

    const dist = Math.hypot(target.x - f.actor.x, target.y - f.actor.y);
    const hasSight = !this.grid.blocksLine(f.actor.x, f.actor.y, target.x, target.y);
    const visible = hasSight && !this.player.hidden;
    const reach = f.actor.rangeType === 'ranged' ? 520 : 120;

    if (visible) {
      f.actor.aim = Math.atan2(target.y - f.actor.y, target.x - f.actor.x);
      if (dist < reach) {
        this.fireAttack(f, f.actor.aim);
        if (f.actor.superReady() && dist < reach * 0.8) this.castUltimate(f);
      }
    }

    // Close to a comfortable range and no closer; a bot that walks into your
    // face is free damage for you.
    const hold = reach * 0.7;
    if (visible && dist < hold) { f.desired = null; return; }

    f.repathIn -= dt;
    let aimAt;
    if (hasSight) {
      aimAt = { x: target.x, y: target.y };
    } else {
      if (f.repathIn <= 0 || !f.waypoint) {
        f.waypoint = this.grid.nextWaypoint(f.actor, target);
        f.repathIn = 0.25;
      }
      aimAt = f.waypoint || { x: target.x, y: target.y };
    }

    const dx = aimAt.x - f.actor.x;
    const dy = aimAt.y - f.actor.y;
    const len = Math.hypot(dx, dy) || 1;
    f.desired = { x: dx / len, y: dy / len, magnitude: 1 };
  }

  /* ---------------- attacks ---------------- */

  /** Fires at the nearest visible enemy, or straight ahead if there is none. */
  autoFire(f) {
    const targets = this.system.enemiesOf(f.actor);
    let best = null, bestDist = Infinity;
    for (const t of targets) {
      const other = this.byActor.get(t);
      if (other && other.hidden) continue;
      const d = Math.hypot(t.x - f.actor.x, t.y - f.actor.y);
      if (d < bestDist) { bestDist = d; best = t; }
    }
    const angle = best
      ? Math.atan2(best.y - f.actor.y, best.x - f.actor.x)
      : f.actor.aim;
    this.fireAttack(f, angle);
  }

  fireAttack(f, angle) {
    f.actor.aim = angle;
    const plan = this.system.requestAttack(f.actor);
    if (!plan) return null;

    f.rig.play('attack', 0.26);
    // The hit lands after the wind-up, not on the button press — that gap is
    // what makes a swing feel like it has weight.
    f.pendingShot = { plan, delay: plan.windup, angle };
    return plan;
  }

  tickPendingShot(f, dt) {
    if (!f.pendingShot) return;
    f.pendingShot.delay -= dt;
    if (f.pendingShot.delay > 0) return;

    const { plan, angle } = f.pendingShot;
    f.pendingShot = null;
    if (!f.actor.alive) return;

    const accent = (f.def.theme && f.def.theme.accent) || '#ffffff';

    if (plan.kind === 'melee') {
      const hits = this.system.resolveMelee(f.actor, { ...plan, aim: angle });
      this.fx.shockwave(
        f.actor.x + Math.cos(angle) * plan.reach * 0.5,
        f.actor.y + Math.sin(angle) * plan.reach * 0.5,
        plan.reach * 0.6, new THREE.Color(accent).getHex(), 0.3
      );
      this.audio.play('swing', { pitch: f.pitch });
      if (hits.length) this.fx.shake(0.12, 8);
    } else {
      this.audio.play('shoot', { pitch: f.pitch });
      this.spawnProjectile(f, {
        angle,
        speed: plan.projectileSpeed,
        radius: plan.projectileRadius,
        damage: plan.damage,
        range: plan.reach,
        knockback: plan.knockback,
        color: new THREE.Color(accent).getHex(),
        kind: 'basic'
      });
    }
  }

  castUltimate(f) {
    const payload = this.system.requestUltimate(f.actor);
    if (!payload) return null;
    this.audio.play('ultimate', { pitch: f.pitch });
    runUltimate(this, f, payload);
    return payload;
  }

  /* ---------------- projectiles ---------------- */

  spawnProjectile(owner, cfg) {
    const mesh = this.projectilePool[this._proj++ % this.projectilePool.length];
    mesh.visible = true;
    mesh.material.color.setHex(cfg.color || 0xffffff);
    mesh.scale.setScalar(cfg.radius);
    mesh.position.set(owner.actor.x, 46, owner.actor.y);

    this.projectiles.push({
      owner, mesh,
      x: owner.actor.x, y: owner.actor.y,
      vx: Math.cos(cfg.angle) * cfg.speed,
      vy: Math.sin(cfg.angle) * cfg.speed,
      radius: cfg.radius,
      damage: cfg.damage,
      knockback: cfg.knockback || 0,
      aoeRadius: cfg.aoeRadius || 0,
      color: cfg.color,
      travelled: 0,
      range: cfg.range,
      kind: cfg.kind || 'basic'
    });
  }

  updateProjectiles(dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const step = Math.hypot(p.vx, p.vy) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.travelled += step;
      p.mesh.position.set(p.x, 46, p.y);

      let done = false;

      if (this.grid.isWallAt(p.x, p.y)) {
        this.fx.sparkBurst(p.x, p.y, p.color, 4, 40);
        done = true;
      } else if (p.travelled >= p.range) {
        done = true;
      } else {
        for (const t of this.system.enemiesOf(p.owner.actor)) {
          if (Math.hypot(t.x - p.x, t.y - p.y) > p.radius + BODY_RADIUS) continue;
          // The body it actually hit always takes damage. Splash on top of that
          // can be smaller than the body itself, and then a direct hit would
          // otherwise deal nothing at all.
          this.system.applyDamage(p.owner.actor, t, p.damage, {
            knockback: p.knockback, originX: p.x, originY: p.y, source: p.kind
          });
          if (p.aoeRadius > p.radius) {
            this.system.resolveAoe(p.owner.actor, p.x, p.y, p.aoeRadius, Math.round(p.damage * 0.6), {
              knockback: p.knockback * 0.6, source: p.kind
            });
            this.fx.shockwave(p.x, p.y, p.aoeRadius, p.color, 0.35);
            this.audio.play('explosion', { size: 0.7 });
          }
          this.fx.sparkBurst(p.x, p.y, p.color, 6, 70);
          done = true;
          break;
        }
      }

      if (done) {
        if (p.aoeRadius > p.radius && !this.grid.isWallAt(p.x, p.y)) {
          this.system.resolveAoe(p.owner.actor, p.x, p.y, p.aoeRadius, Math.round(p.damage * 0.6), {
            knockback: p.knockback * 0.6, source: p.kind
          });
          this.fx.shockwave(p.x, p.y, p.aoeRadius, p.color, 0.35);
          this.audio.play('explosion', { size: 0.7 });
        }
        p.mesh.visible = false;
        this.projectiles.splice(i, 1);
      }
    }
  }

  /* ---------------- dash ---------------- */

  /**
   * Drives a leap. The countdown runs on the same clock as the movement — a
   * dash that ends on a timer while the body moves on the frame loop overshoots
   * every time the frame rate dips.
   */
  beginDash(f, angle, speed, duration, onLand) {
    this.audio.play('dash');
    f.dash = { remaining: duration, onLand };
    f.vx = Math.cos(angle) * speed;
    f.vy = Math.sin(angle) * speed;
    f.actor.aim = angle;
  }

  /* ---------------- movement ---------------- */

  integrate(f, dt) {
    const a = f.actor;
    const max = a.moveSpeed;
    const dashing = !!f.dash;

    if (dashing) {
      f.dash.remaining -= dt;
      if (f.dash.remaining <= 0) {
        const land = f.dash.onLand;
        f.dash = null;
        f.vx *= 0.2;
        f.vy *= 0.2;
        if (land) land();
      }
    }

    const want = (!dashing && a.canMove()) ? f.desired : null;

    if (want) {
      f.vx += want.x * ACCEL * dt;
      f.vy += want.y * ACCEL * dt;
    } else if (!dashing) {
      const damp = Math.max(0, 1 - FRICTION * dt);
      f.vx *= damp;
      f.vy *= damp;
    }

    const sp = Math.hypot(f.vx, f.vy);
    if (!dashing) {
      // Knockback is allowed to exceed the walking cap; steering is not.
      const cap = Math.max(max * (want ? Math.min(1, want.magnitude) : 1), sp * 0.985);
      if (sp > cap && sp > 0) {
        f.vx = (f.vx / sp) * cap;
        f.vy = (f.vy / sp) * cap;
      }
    }

    const nx = a.x + f.vx * dt;
    const ny = a.y + f.vy * dt;
    const solved = this.grid.resolveCircle(nx, ny, BODY_RADIUS);

    // Cancel only the velocity going *into* the wall and keep the rest, so a
    // body brushing a corner slides along it. Scaling both axes instead would
    // stall the fighter on every graze — and a fighter that keeps pushing with
    // nowhere to go is the one whose legs run on the spot.
    const cx = solved.x - nx;
    const cy = solved.y - ny;
    const clen = Math.hypot(cx, cy);
    if (clen > 0.01) {
      const nrmX = cx / clen;
      const nrmY = cy / clen;
      const into = f.vx * nrmX + f.vy * nrmY;
      if (into < 0) {
        f.vx -= nrmX * into;
        f.vy -= nrmY * into;
      }
    }

    a.x = solved.x;
    a.y = solved.y;

    f.speed = Math.hypot(f.vx, f.vy);
    const moveAngle = f.speed > 4 ? Math.atan2(f.vy, f.vx) : null;
    if (moveAngle != null && !f.aiming && !dashing) a.aim = moveAngle;

    f.rig.setPosition(a.x, a.y);
    f.rig.update(dt, {
      speed: dashing ? max : f.speed,
      maxSpeed: max,
      moveAngle,
      aimAngle: (f.aiming || dashing) ? a.aim : null
    });
    f.rig.setVisible(a.alive);
  }

  /* ---------------- aim preview ---------------- */

  showAimLine(f) {
    if (!this.aimLine) {
      const geo = new THREE.PlaneGeometry(1, 1);
      this.aimLine = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 0.3, depthWrite: false
      }));
      this.aimLine.rotation.x = -Math.PI / 2;
      this.scene.add(this.aimLine);
    }
    const reach = f.actor.profile.reach;
    const a = f.actor.aim;
    this.aimLine.visible = true;
    this.aimLine.position.set(
      f.actor.x + Math.cos(a) * reach / 2, 5, f.actor.y + Math.sin(a) * reach / 2
    );
    this.aimLine.scale.set(reach, 22, 1);
    this.aimLine.rotation.z = -a;
    this.aimLine.material.color.set((f.def.theme && f.def.theme.accent) || '#ffffff');
  }

  hideAimLine() {
    if (this.aimLine) this.aimLine.visible = false;
  }

  /* ---------------- camera ---------------- */

  updateCamera(dt) {
    const a = this.player.actor;
    // Lead the camera slightly toward where the player is heading — a shot that
    // sits dead centre shows you where you have been, not where you are going.
    const leadX = this.player.vx * 0.35;
    const leadY = this.player.vy * 0.35;

    // Clamped to the arena so the shot never pans off into empty space.
    const tx = clamp(a.x + leadX, -CAM_MARGIN, this.grid.width + CAM_MARGIN);
    const tz = clamp(a.y + leadY, -CAM_MARGIN * 0.4, this.grid.depth + CAM_MARGIN);

    this.camTarget.set(tx, 55, tz);
    this.camDesired.set(tx + CAM_OFFSET.x, CAM_OFFSET.y, tz + CAM_OFFSET.z);

    const k = 1 - Math.exp(-CAM_LAG * dt);
    this.camBase.lerp(this.camDesired, k);
    // Shake rides on top of the follow rather than being smoothed into it,
    // otherwise the damping eats the whole impact.
    this.camera.position.copy(this.camBase).add(this.fx.shakeOffset);
    this.camera.lookAt(this.camTarget);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.keys.destroy();
    if (this.match) this.match.abort();
    if (this._ultBtn) this._ultBtn.removeEventListener('pointerdown', this._onUlt);
    if (this.moveStick) this.moveStick.destroy();
    if (this.aimStick) this.aimStick.destroy();
    this.hazardView.dispose();
    this.fighters.forEach((f) => f.rig.dispose());
    this.renderer.dispose();
  }
}
