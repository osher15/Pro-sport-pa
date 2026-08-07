/**
 * HUD for the 3D build: health, ammo, super, and the voice-line feed.
 *
 * Everything is DOM on top of the canvas rather than sprites inside the scene —
 * text stays crisp at any resolution, Hebrew lays out right-to-left for free,
 * and none of it costs a draw call.
 */
export class Hud3D {
  constructor() {
    this.el = {
      playerName: document.getElementById('hud-player-name'),
      playerHp: document.getElementById('hud-player-hp'),
      playerHpText: document.getElementById('hud-player-hp-text'),
      enemyName: document.getElementById('hud-enemy-name'),
      enemyHp: document.getElementById('hud-enemy-hp'),
      enemyHpText: document.getElementById('hud-enemy-hp-text'),
      ammo: document.getElementById('hud-ammo'),
      super: document.getElementById('hud-super'),
      feed: document.getElementById('voice-feed')
    };
    this.pips = [];
    this._ammoCapacity = 0;
    this._names = false;
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

  sync(player, enemy) {
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
    this.el.super.parentElement.classList.toggle('is-ready', player.superReady());
  }

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
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
