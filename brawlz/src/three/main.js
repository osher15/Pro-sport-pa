/**
 * Boot for the 3D build: load the roster, draw the character select, run a match.
 *
 * The 2D build stays exactly where it is (index.html). This is a second front
 * end over the same design data and the same combat core.
 */
import { Game3D } from './game.js';
import { Hud3D } from './hud.js';

const state = { data: null, game: null, hud: null, playerId: null };

function loadData() {
  if (window.BRAWLZ_CHARACTERS_FALLBACK && window.BRAWLZ_SINGLE_FILE) {
    return Promise.resolve(window.BRAWLZ_CHARACTERS_FALLBACK);
  }
  return fetch('data/characters.json', { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .catch((err) => {
      console.warn('[BrawlZ3D] characters.json not reachable (' + err.message +
        ') — using the embedded fallback copy.');
      if (!window.BRAWLZ_CHARACTERS_FALLBACK) throw err;
      return window.BRAWLZ_CHARACTERS_FALLBACK;
    });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderMenu(data) {
  document.getElementById('menu-title').textContent = data.game_title;
  document.getElementById('menu-version').textContent = data.version + ' · 3D';

  const list = document.getElementById('character-list');
  list.innerHTML = '';

  data.characters.forEach((def) => {
    const card = document.createElement('button');
    card.className = 'char-card';
    card.type = 'button';
    card.style.setProperty('--card-accent', (def.theme && def.theme.accent) || '#9b8cff');
    card.style.setProperty('--card-body', (def.theme && def.theme.body) || '#4a3f7a');
    card.innerHTML =
      '<span class="char-cat">' + esc(def.category) + '</span>' +
      '<h3 class="char-name">' + esc(def.name_he || def.name) + '</h3>' +
      '<p class="char-sub" dir="ltr">' + esc(def.name) + '</p>' +
      '<dl class="char-stats">' +
        stat('חיים', def.stats.hp) +
        stat('נזק', def.stats.attack_damage) +
        stat('מהירות', def.stats.speed) +
        stat('טווח', def.stats.attack_range === 'ranged' ? 'ירי' : 'מגע') +
      '</dl>';
    card.addEventListener('click', () => startMatch(def.id));
    list.appendChild(card);
  });
}

function stat(label, value) {
  return '<div><dt>' + label + '</dt><dd><bdi>' + esc(String(value)) + '</bdi></dd></div>';
}

function startMatch(playerId) {
  const roster = state.data.characters;
  const others = roster.filter((c) => c.id !== playerId);
  const enemyId = (others.length
    ? others[Math.floor(Math.random() * others.length)]
    : roster[0]).id;

  state.playerId = playerId;
  if (state.game) { state.game.destroy(); state.game = null; }
  state.hud.clearFeed();
  document.body.classList.add('in-match');

  state.game = new Game3D({
    canvas: document.getElementById('game-canvas'),
    roster,
    playerId,
    enemyId,
    mapRows: window.BrawlZ.DEFAULT_MAP,
    hud: state.hud
  });
  state.game.start();

  // Debug handle: lets the browser test harness read live scene state (joint
  // angles, positions, camera) instead of guessing from screenshots.
  window.__brawlz3d = state.game;
}

function backToMenu() {
  if (state.game) { state.game.destroy(); state.game = null; }
  document.body.classList.remove('in-match');
}

window.addEventListener('load', () => {
  state.hud = new Hud3D();
  document.getElementById('btn-menu').addEventListener('click', backToMenu);
  document.getElementById('btn-rematch').addEventListener('click', () => {
    if (state.playerId) startMatch(state.playerId);
  });

  loadData().then((data) => {
    state.data = data;
    renderMenu(data);
    document.getElementById('menu').hidden = false;
  }).catch((err) => {
    console.error('[BrawlZ3D] failed to load character data', err);
    document.getElementById('boot-error').hidden = false;
  });
});
