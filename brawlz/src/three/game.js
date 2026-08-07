/**
 * Game3D — the 3D renderer and loop.
 *
 * Step 1 scope: world, camera, movement, collision, bush concealment, and the
 * jointed rig walking. Combat rides on top of the existing engine-agnostic core
 * (src/core/combat.js) and lands in the next step; the actors are already
 * created here so nothing has to be rebuilt for it.
 */
import * as THREE from '../../vendor/three/three.module.min.js';
import { Grid } from './grid.js';
import { buildArena, buildLights } from './arena.js';
import { Rig } from './rig.js';
import { Stick, Keyboard } from './input.js';

const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);

const BODY_RADIUS = 26;
const ACCEL = 1400;          // world units/s^2 — reached full speed in ~0.14s
const FRICTION = 9;

/**
 * Camera sits behind and above the player at ~43 degrees off the horizontal.
 *
 * Steeper than this and you are looking at the tops of everyone's heads — the
 * faces, and therefore the characters, disappear. Much flatter and the wall
 * blocks hide whatever is behind them.
 */
const CAM_OFFSET = new THREE.Vector3(0, 680, 720);
const CAM_LAG = 6.5;
/** How far the shot may leave the arena before it starts showing the void. */
const CAM_MARGIN = 260;

export class Game3D {
  constructor(opts) {
    const { canvas, roster, playerId, enemyId, mapRows, hud } = opts;

    this.canvas = canvas;
    this.hud = hud || null;
    this.grid = new Grid(mapRows);
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
    this.initInput();

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

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x171232);
    this.scene.fog = new THREE.Fog(0x171232, 1800, 3200);

    this.camera = new THREE.PerspectiveCamera(32, 1, 50, 5000);
    this.camDesired = new THREE.Vector3();
    this.camTarget = new THREE.Vector3();
  }

  initWorld() {
    buildArena(this.scene, this.grid);
    buildLights(this.scene, this.grid);
  }

  initFighters() {
    const BrawlZ = window.BrawlZ;
    this.system = new BrawlZ.CombatSystem();

    const spawnA = this.grid.spawns[0][0] || { x: 200, y: 200 };
    const spawnB = this.grid.spawns[1][1] || this.grid.spawns[1][0] ||
      { x: this.grid.width - 200, y: this.grid.depth - 200 };

    this.player = this.makeFighter(this.playerDef, {
      team: 0, isPlayer: true, x: spawnA.x, y: spawnA.y, ring: 0x35d6ff
    });
    this.enemy = this.makeFighter(this.enemyDef, {
      team: 1, isPlayer: false, x: spawnB.x, y: spawnB.y, ring: 0xff4d5e
    });
    this.fighters = [this.player, this.enemy];

    // The voice director already knows how to turn combat events into the
    // Hebrew lines; it just needs somewhere to put them.
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
      vx: 0, vy: 0,
      speed: 0,
      waypoint: null,
      repathIn: 0
    };
  }

  initInput() {
    this.keys = new Keyboard();
    const zone = document.getElementById('move-zone');
    const knob = document.getElementById('move-knob');
    this.moveStick = zone && knob ? new Stick(zone, knob, { radius: 54 }) : null;
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
    this.system.update(dt);

    this.drivePlayer(dt);
    this.driveBot(dt);

    for (const f of this.fighters) this.integrate(f, dt);

    // Concealment is symmetric in effect but asymmetric in maths: you are
    // hidden from whoever is far away, so each fighter is tested against the
    // other's eyes.
    const p = this.player, e = this.enemy;
    p.rig.setConcealed(this.grid.isConcealed(p.actor.x, p.actor.y, e.actor.x, e.actor.y));
    e.rig.setConcealed(this.grid.isConcealed(e.actor.x, e.actor.y, p.actor.x, p.actor.y));

    this.updateCamera(dt);
    if (this.hud) this.hud.sync(this.player.actor, this.enemy.actor);
  }

  /** Reads the stick or the keyboard into a desired direction. */
  drivePlayer(dt) {
    const f = this.player;
    let dir = null;

    if (this.moveStick && this.moveStick.active && this.moveStick.magnitude > 0.12) {
      dir = { x: this.moveStick.x, y: this.moveStick.y, magnitude: this.moveStick.magnitude };
    } else {
      dir = this.keys.vector();
    }

    f.desired = dir;
  }

  /**
   * Step 1 bot: walks a BFS path toward the player and stops at a comfortable
   * distance. It does not shoot yet — that arrives with the combat step.
   */
  driveBot(dt) {
    const f = this.enemy;
    const target = this.player.actor;
    if (!f.actor.alive || !target.alive) { f.desired = null; return; }

    const dist = Math.hypot(target.x - f.actor.x, target.y - f.actor.y);
    const hidden = this.grid.isConcealed(target.x, target.y, f.actor.x, f.actor.y);

    if (hidden || dist < 220) { f.desired = null; return; }

    f.repathIn -= dt;
    const hasSight = !this.grid.blocksLine(f.actor.x, f.actor.y, target.x, target.y);

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

  /**
   * Velocity, collision, and the rig update for one fighter.
   *
   * Acceleration rather than a teleporting velocity is what gives the body
   * something to lean into; the rig reads the resulting speed, so the walk
   * cycle and the movement can never disagree.
   */
  integrate(f, dt) {
    const a = f.actor;
    const max = a.moveSpeed;
    const want = a.canMove() ? f.desired : null;

    if (want) {
      f.vx += want.x * ACCEL * dt;
      f.vy += want.y * ACCEL * dt;
    } else {
      const damp = Math.max(0, 1 - FRICTION * dt);
      f.vx *= damp;
      f.vy *= damp;
    }

    const sp = Math.hypot(f.vx, f.vy);
    const cap = max * (want ? Math.min(1, want.magnitude) : 1);
    if (sp > cap && sp > 0) {
      f.vx = (f.vx / sp) * cap;
      f.vy = (f.vy / sp) * cap;
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
    if (moveAngle != null) a.aim = moveAngle;

    f.rig.setPosition(a.x, a.y);
    f.rig.update(dt, { speed: f.speed, maxSpeed: max, moveAngle, aimAngle: null });
    f.rig.setVisible(a.alive);
  }

  updateCamera(dt) {
    const a = this.player.actor;
    // Lead the camera slightly toward where the player is heading — a shot that
    // sits dead centre shows you where you have been, not where you are going.
    const leadX = this.player.vx * 0.35;
    const leadY = this.player.vy * 0.35;

    // Clamped to the arena so the shot never pans off into empty space.
    const tx = clamp(a.x + leadX, -CAM_MARGIN, this.grid.width + CAM_MARGIN);
    const tz = clamp(a.y + leadY, -CAM_MARGIN, this.grid.depth + CAM_MARGIN);

    this.camTarget.set(tx, 55, tz);
    this.camDesired.set(tx + CAM_OFFSET.x, CAM_OFFSET.y, tz + CAM_OFFSET.z);

    const k = 1 - Math.exp(-CAM_LAG * dt);
    this.camera.position.lerp(this.camDesired, k);
    this.camera.lookAt(this.camTarget);
  }

  destroy() {
    this.stop();
    window.removeEventListener('resize', this.onResize);
    this.keys.destroy();
    if (this.moveStick) this.moveStick.destroy();
    this.fighters.forEach((f) => f.rig.dispose());
    this.renderer.dispose();
  }
}
