/**
 * Boot: load the character data, render the (RTL) character select, and start
 * a match. The design data is the only source of truth — nothing about a
 * specific character is hard-coded here.
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  BrawlZ.FONT = '"Noto Sans Hebrew", "Arial Hebrew", Arial, sans-serif';

  var state = {
    data: null,
    game: null,
    hud: null,
    playerId: null
  };

  /* ---------------- data ---------------- */

  function loadData() {
    // The single-file build has no files to fetch — the data is already here.
    if (global.BRAWLZ_SINGLE_FILE && global.BRAWLZ_CHARACTERS_FALLBACK) {
      return Promise.resolve(global.BRAWLZ_CHARACTERS_FALLBACK);
    }
    return fetch('data/characters.json', { cache: 'no-store' })
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .catch(function (err) {
        console.warn('[BrawlZ] characters.json not reachable (' + err.message +
          ') — using the embedded fallback copy.');
        if (!global.BRAWLZ_CHARACTERS_FALLBACK) throw err;
        return global.BRAWLZ_CHARACTERS_FALLBACK;
      });
  }

  /* ---------------- character select ---------------- */

  function renderMenu(data) {
    document.getElementById('menu-title').textContent = data.game_title;
    document.getElementById('menu-version').textContent = data.version;

    var list = document.getElementById('character-list');
    list.innerHTML = '';

    data.characters.forEach(function (def) {
      var card = document.createElement('button');
      card.className = 'char-card';
      card.type = 'button';
      card.style.setProperty('--card-accent', (def.theme && def.theme.accent) || '#9b8cff');

      card.innerHTML =
        '<div class="char-head">' +
          (def.sprite ? '<img class="char-art" src="' + esc(def.sprite) + '" alt="">' : '') +
          '<div class="char-id">' +
            '<span class="char-cat">' + esc(def.category) + '</span>' +
            '<h3 class="char-name">' + esc(def.name_he || def.name) + '</h3>' +
            '<p class="char-sub" dir="ltr">' + esc(def.name) + '</p>' +
          '</div>' +
        '</div>' +
        '<dl class="char-stats">' +
          statRow('חיים', def.stats.hp) +
          statRow('נזק', def.stats.attack_damage) +
          statRow('מהירות', def.stats.speed) +
          statRow('טווח', def.stats.attack_range === 'ranged' ? 'ירי' : 'מגע') +
        '</dl>' +
        '<div class="char-ult">' +
          '<span class="char-ult-label">אולטימייט</span>' +
          '<b dir="ltr">' + esc(def.ultimate.name) + '</b>' +
          '<span class="char-ult-cd">קירור: ' + def.ultimate.cooldown + ' שניות</span>' +
        '</div>';

      card.addEventListener('click', function () { startMatch(def.id); });
      list.appendChild(card);
    });
  }

  function statRow(label, value) {
    return '<div><dt>' + label + '</dt><dd><bdi>' + esc(String(value)) + '</bdi></dd></div>';
  }

  function esc(str) {
    return String(str).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------------- match lifecycle ---------------- */

  function startMatch(playerId) {
    var roster = state.data.characters;
    var others = roster.filter(function (c) { return c.id !== playerId; });
    var enemyId = (others.length
      ? others[Math.floor(Math.random() * others.length)]
      : roster[0]).id;

    state.playerId = playerId;
    if (state.game) { state.game.destroy(true); state.game = null; }
    state.hud.clearFeed();

    document.body.classList.add('in-match');

    var payload = {
      roster: roster,
      playerId: playerId,
      enemyId: enemyId,
      hud: state.hud
    };

    // Match the device's aspect instead of a fixed 16:9. FIT would otherwise
    // letterbox a wide phone, throwing away a strip of screen on both sides —
    // and the world is bigger than the view anyway, so a wider camera just
    // shows more arena.
    var aspect = (window.innerWidth || BrawlZ.VIEW_W) / (window.innerHeight || BrawlZ.VIEW_H);
    var viewH = BrawlZ.VIEW_H;
    var viewW = Math.round(Math.min(1500, Math.max(720, viewH * aspect)));

    state.game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: 'game-root',
      width: viewW,
      height: viewH,
      backgroundColor: '#121020',
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { y: 0 }, debug: false }
      },
      // Added in postBoot instead of config.scene so the match payload reaches
      // init() on the very first start (a config scene auto-starts with no data).
      callbacks: {
        postBoot: function (game) {
          game.scene.add('Arena', BrawlZ.ArenaScene, true, payload);
        }
      }
    });
  }

  function backToMenu() {
    if (state.game) { state.game.destroy(true); state.game = null; }
    document.body.classList.remove('in-match');
  }

  /* ---------------- go ---------------- */

  window.addEventListener('load', function () {
    if (typeof Phaser === 'undefined') {
      document.getElementById('boot-error').hidden = false;
      return;
    }

    state.hud = new BrawlZ.Hud();

    document.getElementById('btn-menu').addEventListener('click', backToMenu);
    document.getElementById('btn-rematch').addEventListener('click', function () {
      if (state.playerId) startMatch(state.playerId);
    });

    loadData().then(function (data) {
      state.data = data;
      renderMenu(data);
      document.getElementById('menu').hidden = false;
    }).catch(function (err) {
      console.error('[BrawlZ] failed to load character data', err);
      document.getElementById('boot-error').hidden = false;
    });
  });
})(typeof window !== 'undefined' ? window : globalThis);
