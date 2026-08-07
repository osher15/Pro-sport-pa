/**
 * HUD for the 3D build: health, ammo, super, match clock and score, the
 * countdown, the voice-line feed, and the result screen.
 *
 * Everything is DOM on top of the canvas rather than sprites inside the scene —
 * text stays crisp at any resolution, Hebrew lays out right-to-left for free,
 * and none of it costs a draw call.
 */
import { Match } from '../core/match.js';

export class Hud3D {
  constructor() {
    this.el = {
      playerName: document.getElementById('hud-player-name'),
      playerHp: document.getElementById('hud-player-hp'),
      playerHpText: document.getElementById('hud-player-hp-text'),
      playerCore: document.getElementById('hud-player-core'),
      playerEffects: document.getElementById('hud-player-effects'),
      enemyName: document.getElementById('hud-enemy-name'),
      enemyHp: document.getElementById('hud-enemy-hp'),
      enemyHpText: document.getElementById('hud-enemy-hp-text'),
      enemyCore: document.getElementById('hud-enemy-core'),
      ammo: document.getElementById('hud-ammo'),
      super: document.getElementById('hud-super'),
      feed: document.getElementById('voice-feed'),
      clock: document.getElementById('hud-clock'),
      scoreUs: document.getElementById('hud-score-us'),
      scoreThem: document.getElementById('hud-score-them'),
      countdown: document.getElementById('hud-countdown'),
      result: document.getElementById('result'),
      resultTitle: document.getElementById('result-title'),
      resultLine: document.getElementById('result-line'),
      resultScore: document.getElementById('result-score')
    };
    this.pips = [];
    this._ammoCapacity = 0;
    this._names = false;
    this._superReady = null;
    this._clockText = null;
    this._effectKey = null;
  }

  /* ---------------- per-frame ---------------- */

  sync(player, enemy, match) {
    if (!this._names) {
      this.el.playerName.textContent = player.displayName;
      this.el.enemyName.textContent = enemy.displayName;
      this._names = true;
    }

    const ph = player.hpRatio();
    this.el.playerHp.style.width = (ph * 100).toFixed(1) + '%';
    this.el.playerHp.classList.toggle('is-low', ph < 0.3);
    this.el.playerHpText.textContent = Math.ceil(player.hp) + ' / ' + player.maxHp;

    const eh = enemy.hpRatio();
    this.el.enemyHp.style.width = (eh * 100).toFixed(1) + '%';
    this.el.enemyHpText.textContent = Math.ceil(enemy.hp) + ' / ' + enemy.maxHp;

    this.ensurePips(player.ammoCapacity);
    for (let i = 0; i < this.pips.length; i++) {
      const full = i < player.ammo;
      this.pips[i].classList.toggle('is-full', full);
      // the pip currently refilling shows its progress
      this.pips[i].style.setProperty(
        '--fill', full ? '1' : (i === player.ammo ? player.reloadProgress().toFixed(2) : '0')
      );
    }

    this.el.super.style.width = (Math.min(1, player.superCharge) * 100).toFixed(1) + '%';
    const ready = player.superReady();
    this.el.super.parentElement.classList.toggle('is-ready', ready);
    if (ready !== this._superReady) {
      this._superReady = ready;
      document.body.classList.toggle('super-ready', ready);
    }

    this.syncEffects(player);

    if (!match) return;

    if (!this.el.countdown.hidden && match.live && match.elapsed > 0.8) {
      this.el.countdown.hidden = true;
    }

    // Only touch the DOM when the displayed second actually changes.
    const text = Match.clock(match.timeLeft);
    if (text !== this._clockText) {
      this._clockText = text;
      this.el.clock.textContent = text;
      this.el.clock.classList.toggle('is-urgent', match.timeLeft <= 15);
    }
  }

  /** Little badges for burn / slow — the player has to know why they are slow. */
  syncEffects(player) {
    const key = player.effects.map((e) => e.id).join(',');
    if (key === this._effectKey) return;
    this._effectKey = key;

    this.el.playerEffects.innerHTML = '';
    for (const fx of player.effects) {
      const badge = document.createElement('span');
      badge.className = 'fx-badge fx-' + fx.id;
      badge.textContent = fx.label_he || fx.id;
      this.el.playerEffects.appendChild(badge);
    }
  }

  ensurePips(capacity) {
    if (this._ammoCapacity === capacity) return;
    this._ammoCapacity = capacity;
    this.el.ammo.innerHTML = '';
    this.pips = [];
    for (let i = 0; i < capacity; i++) {
      const pip = document.createElement('span');
      pip.className = 'ammo-pip';
      this.el.ammo.appendChild(pip);
      this.pips.push(pip);
    }
  }

  /* ---------------- match events ---------------- */

  matchEvent(name, payload) {
    switch (name) {
      case 'countdown':
        this.el.countdown.hidden = false;
        this.el.countdown.textContent = payload.seconds;
        // restart the pop so consecutive numbers each animate
        this.el.countdown.classList.remove('is-beat');
        void this.el.countdown.offsetWidth;
        this.el.countdown.classList.add('is-beat');
        break;

      case 'start':
        this.el.countdown.textContent = 'קדימה!';
        this.el.countdown.classList.remove('is-beat');
        void this.el.countdown.offsetWidth;
        this.el.countdown.classList.add('is-beat');
        // Hidden by sync() on the match clock, not by a wall-clock timer: a
        // full-screen "GO!" left on top of a live fight is not a risk worth
        // taking on a timer that can be starved by a slow frame.
        break;

      case 'score':
        this.el.scoreUs.textContent = payload.score[0] || 0;
        this.el.scoreThem.textContent = payload.score[1] || 0;
        this.el.scoreUs.parentElement.classList.remove('is-beat');
        void this.el.scoreUs.parentElement.offsetWidth;
        this.el.scoreUs.parentElement.classList.add('is-beat');
        break;

      case 'end':
        this.showResult(payload);
        break;

      default:
        break;
    }
  }

  showResult(result) {
    const won = result.winner === 0;
    const draw = result.winner === null;

    this.el.result.hidden = false;
    this.el.result.classList.toggle('is-win', won);
    this.el.result.classList.toggle('is-loss', !won && !draw);

    this.el.resultTitle.textContent = draw ? 'תיקו' : (won ? 'ניצחת!' : 'הפסדת');
    this.el.resultLine.textContent = result.reason === 'time'
      ? 'הזמן נגמר'
      : (won ? 'הגעת ליעד ההרגים' : 'היריב הגיע ליעד ההרגים');
    this.el.resultScore.textContent = (result.score[0] || 0) + ' — ' + (result.score[1] || 0);
  }

  setCoreBadges(playerCore, enemyCore) {
    const paint = (el, core) => {
      if (!el) return;
      if (!core) { el.hidden = true; return; }
      el.hidden = false;
      el.textContent = (core.glyph || '') + ' ' + (core.name_he || core.name);
      el.style.setProperty('--tint', core.tint || '#9a94b3');
    };
    paint(this.el.playerCore, playerCore);
    paint(this.el.enemyCore, enemyCore);
  }

  /* ---------------- voice lines ---------------- */

  say(line) {
    const row = document.createElement('div');
    row.className = 'voice-line voice-' + line.key;
    row.innerHTML =
      '<span class="voice-who">' + escapeHtml(line.speaker) + '</span>' +
      '<span class="voice-text">' + escapeHtml(line.text) + '</span>';
    this.el.feed.prepend(row);
    while (this.el.feed.children.length > 5) this.el.feed.lastChild.remove();
    setTimeout(() => row.classList.add('is-fading'), 4200);
    setTimeout(() => row.remove(), 5200);
  }

  clearFeed() { this.el.feed.innerHTML = ''; }

  /** Between matches: the names and score belong to the fight that just ended. */
  reset() {
    this.clearFeed();
    this._names = false;
    this._ammoCapacity = 0;
    this._clockText = null;
    this._effectKey = null;
    this.el.scoreUs.textContent = '0';
    this.el.scoreThem.textContent = '0';
    this.el.result.hidden = true;
    this.el.countdown.hidden = true;
    this.el.playerEffects.innerHTML = '';
    document.body.classList.remove('super-ready');
  }
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
