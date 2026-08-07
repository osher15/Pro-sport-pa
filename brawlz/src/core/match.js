/**
 * The match loop — the thing that turns a fight into a game.
 *
 * Until this existed you could shoot forever and nothing happened. A match has
 * a clock, a score, and an ending that produces a result, which is what every
 * later system hangs off: rewards, progression, unlocks, seasons. None of those
 * can exist without a moment where the game says "you won".
 *
 * Pure rules, no engine import. It watches the CombatSystem's events and owns
 * nothing but time and score.
 *
 * Phases: countdown → live → over
 */

export const MATCH_DEFAULTS = {
  countdown: 3,
  duration: 120,
  scoreToWin: 5,
  /** Deaths during the countdown or after the bell should not count. */
  scoreDuringCountdown: false
};

export class Match {
  /**
   * @param {object} system  CombatSystem to watch
   * @param {object} config  overrides for MATCH_DEFAULTS
   * @param {object} opts    { onEvent(name, payload) }
   */
  constructor(system, config = {}, opts = {}) {
    this.system = system;
    this.config = { ...MATCH_DEFAULTS, ...config };
    this.onEvent = opts.onEvent || (() => {});

    this.phase = 'countdown';
    this.timeLeft = this.config.duration;
    this.countdownLeft = this.config.countdown;
    this.elapsed = 0;

    /** Score by team index. */
    this.score = { 0: 0, 1: 0 };
    this.result = null;

    this._offKill = system.on('kill', (e) => this.onKill(e));
    this._offDeath = system.on('death', (e) => this.onDeath(e));

    this.onEvent('countdown', { seconds: this.countdownLeft });
  }

  /** True while the fight is actually running — the renderer gates input on this. */
  get live() { return this.phase === 'live'; }
  get over() { return this.phase === 'over'; }

  onKill(e) {
    if (!this.live && !this.config.scoreDuringCountdown) return;
    const team = e.source.team;
    this.score[team] = (this.score[team] || 0) + 1;
    this.onEvent('score', { team, score: this.score, by: e.source, on: e.target });

    if (this.config.scoreToWin && this.score[team] >= this.config.scoreToWin) {
      this.finish(team, 'score');
    }
  }

  /**
   * A death with no killer — a meteor, a fall — still counts for the other
   * side. Otherwise the arena becomes the safest way to avoid losing a point.
   */
  onDeath(e) {
    if (e.killer) return;
    if (!this.live && !this.config.scoreDuringCountdown) return;
    const team = e.actor.team === 0 ? 1 : 0;
    this.score[team] = (this.score[team] || 0) + 1;
    this.onEvent('score', { team, score: this.score, by: null, on: e.actor });
    if (this.config.scoreToWin && this.score[team] >= this.config.scoreToWin) {
      this.finish(team, 'score');
    }
  }

  update(dt) {
    if (this.phase === 'over') return;

    if (this.phase === 'countdown') {
      const before = Math.ceil(this.countdownLeft);
      this.countdownLeft -= dt;
      const now = Math.ceil(this.countdownLeft);
      if (now !== before && now > 0) this.onEvent('countdown', { seconds: now });
      if (this.countdownLeft <= 0) {
        this.phase = 'live';
        this.onEvent('start', {});
      }
      return;
    }

    this.elapsed += dt;
    const before = Math.ceil(this.timeLeft);
    this.timeLeft = Math.max(0, this.timeLeft - dt);
    const now = Math.ceil(this.timeLeft);
    if (now !== before) this.onEvent('tick', { timeLeft: this.timeLeft, seconds: now });

    if (this.timeLeft <= 0) {
      const a = this.score[0] || 0;
      const b = this.score[1] || 0;
      this.finish(a === b ? null : (a > b ? 0 : 1), 'time');
    }
  }

  finish(winnerTeam, reason) {
    if (this.phase === 'over') return;
    this.phase = 'over';
    this.result = {
      winner: winnerTeam,          // 0, 1, or null for a draw
      reason,                      // 'score' | 'time'
      score: { ...this.score },
      elapsed: this.elapsed
    };
    this.onEvent('end', this.result);
  }

  /** Ends the match early — used when the player quits to the menu. */
  abort() {
    if (this.phase !== 'over') {
      this.phase = 'over';
      this.result = null;
    }
    this.dispose();
  }

  dispose() {
    if (this._offKill) { this._offKill(); this._offKill = null; }
    if (this._offDeath) { this._offDeath(); this._offDeath = null; }
  }

  /** mm:ss for the clock. */
  static clock(seconds) {
    const s = Math.max(0, Math.ceil(seconds));
    return String(Math.floor(s / 60)) + ':' + String(s % 60).padStart(2, '0');
  }
}
