/**
 * Input: one virtual thumbstick per zone, plus keyboard for desktop testing.
 *
 * A stick reports a unit vector in the combat core's coordinates (x right,
 * y "down" the map, which is +Z in three.js), so nothing downstream has to know
 * whether a finger or a keyboard produced it.
 */

export class Stick {
  /**
   * @param {HTMLElement} zone   the area a finger may start in
   * @param {HTMLElement} knob   the visual handle
   * @param {object} opts        { radius, onRelease(vec, magnitude) }
   */
  constructor(zone, knob, opts = {}) {
    this.zone = zone;
    this.knob = knob;
    this.radius = opts.radius || 52;
    this.onRelease = opts.onRelease || null;
    this.x = 0;
    this.y = 0;
    this.magnitude = 0;
    this.active = false;
    this.pointerId = null;
    this.origin = { x: 0, y: 0 };

    this._down = this._down.bind(this);
    this._move = this._move.bind(this);
    this._up = this._up.bind(this);

    zone.addEventListener('pointerdown', this._down);
    window.addEventListener('pointermove', this._move);
    window.addEventListener('pointerup', this._up);
    window.addEventListener('pointercancel', this._up);
  }

  _down(e) {
    if (this.active) return;
    this.active = true;
    this.pointerId = e.pointerId;
    const r = this.zone.getBoundingClientRect();
    this.origin = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    this.zone.classList.add('is-active');
    this._track(e);
    e.preventDefault();
  }

  _move(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    this._track(e);
  }

  _track(e) {
    let dx = e.clientX - this.origin.x;
    let dy = e.clientY - this.origin.y;
    const len = Math.hypot(dx, dy);
    const clamped = Math.min(len, this.radius);
    if (len > 0.0001) {
      this.x = dx / len;
      this.y = dy / len;
    }
    this.magnitude = clamped / this.radius;
    this.knob.style.transform =
      `translate(-50%, -50%) translate(${this.x * clamped}px, ${this.y * clamped}px)`;
  }

  _up(e) {
    if (!this.active || e.pointerId !== this.pointerId) return;
    // Capture the gesture before zeroing it — a release-to-fire stick needs the
    // direction the finger was holding, and the reset would have thrown it away.
    const gesture = { x: this.x, y: this.y, magnitude: this.magnitude };
    this.active = false;
    this.pointerId = null;
    this.x = this.y = 0;
    this.magnitude = 0;
    this.knob.style.transform = 'translate(-50%, -50%)';
    this.zone.classList.remove('is-active');
    if (this.onRelease) this.onRelease(gesture);
  }

  destroy() {
    this.zone.removeEventListener('pointerdown', this._down);
    window.removeEventListener('pointermove', this._move);
    window.removeEventListener('pointerup', this._up);
    window.removeEventListener('pointercancel', this._up);
  }
}

export class Keyboard {
  constructor() {
    this.keys = Object.create(null);
    this._down = (e) => { this.keys[e.code] = true; };
    this._up = (e) => { this.keys[e.code] = false; };
    window.addEventListener('keydown', this._down);
    window.addEventListener('keyup', this._up);
  }

  /** Movement as a unit vector, or null when nothing is held. */
  vector() {
    const k = this.keys;
    let x = 0, y = 0;
    if (k.KeyA || k.ArrowLeft) x -= 1;
    if (k.KeyD || k.ArrowRight) x += 1;
    if (k.KeyW || k.ArrowUp) y -= 1;
    if (k.KeyS || k.ArrowDown) y += 1;
    if (x === 0 && y === 0) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len, magnitude: 1 };
  }

  pressed(code) { return !!this.keys[code]; }

  destroy() {
    window.removeEventListener('keydown', this._down);
    window.removeEventListener('keyup', this._up);
  }
}
