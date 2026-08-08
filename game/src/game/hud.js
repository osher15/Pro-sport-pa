/**
 * HUD — the DOM layer on top of the canvas (RTL Hebrew).
 *
 * Kept in DOM rather than in Phaser so the Hebrew copy gets real bidi handling
 * from the browser instead of hand-placed canvas text.
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  function Hud() {
    this.el = {
      playerName: document.getElementById('hud-player-name'),
      playerHpFill: document.getElementById('hud-player-hp'),
      playerHpText: document.getElementById('hud-player-hp-text'),
      playerKills: document.getElementById('hud-player-kills'),
      ultFill: document.getElementById('hud-ult-fill'),
      ultText: document.getElementById('hud-ult-text'),
      ultName: document.getElementById('hud-ult-name'),
      enemyName: document.getElementById('hud-enemy-name'),
      enemyHpFill: document.getElementById('hud-enemy-hp'),
      enemyHpText: document.getElementById('hud-enemy-hp-text'),
      enemyKills: document.getElementById('hud-enemy-kills'),
      feed: document.getElementById('voice-feed'),
      ammo: document.getElementById('hud-ammo'),
      ultButton: document.getElementById('ult-zone')
    };
    this.player = null;
    this.enemy = null;
  }

  Hud.prototype.bind = function (playerActor, enemyActor) {
    this.player = playerActor;
    this.enemy = enemyActor;
    this.el.playerName.textContent = playerActor.displayName;
    this.el.enemyName.textContent = enemyActor.displayName;
    this.el.ultName.textContent = playerActor.ultimate ? playerActor.ultimate.name : '—';

    // one pip per ammo slot, built from the character's own capacity
    this.el.ammo.innerHTML = '';
    this.pips = [];
    for (var i = 0; i < playerActor.ammoCapacity; i++) {
      var pip = document.createElement('i');
      pip.className = 'pip';
      this.el.ammo.appendChild(pip);
      this.pips.push(pip);
    }
    this.clearFeed();
  };

  Hud.prototype.clearFeed = function () {
    this.el.feed.innerHTML = '';
  };

  Hud.prototype.update = function () {
    if (!this.player) return;
    var p = this.player;
    var e = this.enemy;

    this.el.playerHpFill.style.width = (p.hpRatio() * 100).toFixed(1) + '%';
    this.el.playerHpText.textContent = Math.ceil(p.hp) + ' / ' + p.maxHp;
    this.el.playerKills.textContent = p.kills;

    this.el.enemyHpFill.style.width = (e.hpRatio() * 100).toFixed(1) + '%';
    this.el.enemyHpText.textContent = Math.ceil(e.hp) + ' / ' + e.maxHp;
    this.el.enemyKills.textContent = e.kills;

    // ammo pips: full, currently reloading, or empty
    for (var i = 0; i < this.pips.length; i++) {
      var filled = i < Math.floor(p.ammo);
      var loading = !filled && i === Math.floor(p.ammo) && p.ammo < p.ammoCapacity;
      this.pips[i].classList.toggle('full', filled);
      this.pips[i].classList.toggle('loading', loading);
      this.pips[i].style.setProperty('--fill', loading ? (p.reloadProgress() * 100).toFixed(0) + '%' : '0%');
    }

    // super charge — earned from damage dealt, not from a timer
    var ready = p.superReady();
    this.el.ultFill.style.width = (Math.min(1, p.superCharge) * 100).toFixed(1) + '%';
    this.el.ultText.textContent = ready ? 'מוכן!' : Math.round(p.superCharge * 100) + '% טעון';
    this.el.ultButton.classList.toggle('ready', ready);
  };

  /** One line of slang from the JSON, newest on top. */
  Hud.prototype.pushLine = function (line) {
    var li = document.createElement('li');
    li.className = 'voice-line voice-' + line.key;

    var tag = document.createElement('span');
    tag.className = 'voice-tag';
    tag.textContent = line.label;

    var who = document.createElement('span');
    who.className = 'voice-speaker';
    who.textContent = line.speaker;

    var text = document.createElement('p');
    text.className = 'voice-text';
    text.textContent = line.text;

    li.appendChild(tag);
    li.appendChild(who);
    li.appendChild(text);
    this.el.feed.insertBefore(li, this.el.feed.firstChild);

    while (this.el.feed.children.length > 6) {
      this.el.feed.removeChild(this.el.feed.lastChild);
    }
    requestAnimationFrame(function () { li.classList.add('in'); });
  };

  BrawlZ.Hud = Hud;
})(typeof window !== 'undefined' ? window : globalThis);
