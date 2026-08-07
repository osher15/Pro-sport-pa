/**
 * Boot for the 3D build: load the roster and the arenas, draw the two-step
 * select, run a match.
 *
 * The 2D build stays exactly where it is (index.html). This is a second front
 * end over the same design data and the same combat core.
 */
import { Game3D } from './game.js';
import { Hud3D } from './hud.js';

const state = { data: null, arenas: null, game: null, hud: null, playerId: null, arenaId: null };

function loadJson(path, fallback) {
  return fetch(path, { cache: 'no-store' })
    .then((res) => {
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return res.json();
    })
    .catch((err) => {
      console.warn('[BrawlZ3D] ' + path + ' not reachable (' + err.message + ')');
      if (!fallback) throw err;
      return fallback;
    });
}

/**
 * The single arena that ships inside the fallback bundle, so a file:// open
 * still gets a playable match instead of an error page.
 */
function builtinArena() {
  return {
    version: 'offline',
    arenas: [{
      id: 'arena_mine',
      name: 'Gold Mine',
      name_he: 'מכרה הזהב',
      blurb_he: 'הזירה הקלאסית.',
      difficulty: 1,
      grid: window.BrawlZ.DEFAULT_MAP,
      tile: window.BrawlZ.MAP_TILE,
      art: null,
      palette: {},
      hazards: []
    }]
  };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- menu ---------------- */

function renderMenu() {
  document.getElementById('menu-title').textContent = state.data.game_title;
  document.getElementById('menu-version').textContent = state.data.version + ' · 3D';

  const list = document.getElementById('arena-list');
  list.innerHTML = '';
  state.arenas.arenas.forEach((arena) => {
    const card = document.createElement('button');
    card.className = 'arena-card';
    card.type = 'button';
    const pal = arena.palette || {};
    card.style.setProperty('--a-sky', pal.sky || '#171232');
    card.style.setProperty('--a-floor', pal.floor || '#c9a86a');
    card.style.setProperty('--a-wall', pal.wall || '#8a6b4f');
    card.innerHTML =
      '<span class="arena-thumb">' + miniMap(arena) + '</span>' +
      '<span class="arena-body">' +
        '<b class="arena-name">' + esc(arena.name_he || arena.name) + '</b>' +
        '<span class="arena-sub" dir="ltr">' + esc(arena.name) + '</span>' +
        '<span class="arena-blurb">' + esc(arena.blurb_he || '') + '</span>' +
        '<span class="arena-tags">' + hazardTags(arena) + '</span>' +
      '</span>';
    card.addEventListener('click', () => selectArena(arena.id));
    list.appendChild(card);
  });

  const chars = document.getElementById('character-list');
  chars.innerHTML = '';
  state.data.characters.forEach((def) => {
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
    chars.appendChild(card);
  });

  selectArena(state.arenas.arenas[0].id);
}

/** A tiny readable picture of the layout, drawn straight from the grid. */
function miniMap(arena) {
  return arena.grid.map((row) =>
    '<span class="mini-row">' + row.split('').map((ch) =>
      '<i class="mini mini-' + ({ '#': 'wall', '*': 'bush', A: 'spawn', B: 'spawn' }[ch] || 'open') + '"></i>'
    ).join('') + '</span>'
  ).join('');
}

function hazardTags(arena) {
  const labels = {
    meteor_rain: '☄️ מטאורים',
    supply_drop: '📦 ארגזי אספקה',
    energy_pad: '⚡ רפידות אנרגיה'
  };
  const tags = (arena.hazards || []).map((h) => labels[h.type]).filter(Boolean);
  if (!tags.length) tags.push('🛡️ ללא מפגעים');
  return tags.map((t) => '<em class="tag">' + esc(t) + '</em>').join('');
}

function stat(label, value) {
  return '<div><dt>' + label + '</dt><dd><bdi>' + esc(String(value)) + '</bdi></dd></div>';
}

function selectArena(id) {
  state.arenaId = id;
  document.querySelectorAll('.arena-card').forEach((card, i) => {
    card.classList.toggle('is-picked', state.arenas.arenas[i].id === id);
  });
}

/* ---------------- match ---------------- */

function currentArena() {
  return state.arenas.arenas.find((a) => a.id === state.arenaId) || state.arenas.arenas[0];
}

function startMatch(playerId) {
  const roster = state.data.characters;
  const others = roster.filter((c) => c.id !== playerId);
  const enemyId = (others.length
    ? others[Math.floor(Math.random() * others.length)]
    : roster[0]).id;

  state.playerId = playerId;
  if (state.game) { state.game.destroy(); state.game = null; }
  state.hud.reset();
  document.body.classList.add('in-match');

  const arena = currentArena();
  document.getElementById('hud-arena-name').textContent = arena.name_he || arena.name;

  state.game = new Game3D({
    canvas: document.getElementById('game-canvas'),
    roster,
    playerId,
    enemyId,
    arena,
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

  Promise.all([
    loadJson('data/characters.json', window.BRAWLZ_CHARACTERS_FALLBACK),
    loadJson('data/arenas.json', builtinArena())
  ]).then(([data, arenas]) => {
    state.data = data;
    state.arenas = arenas;
    renderMenu();
    document.getElementById('menu').hidden = false;
  }).catch((err) => {
    console.error('[BrawlZ3D] failed to load game data', err);
    document.getElementById('boot-error').hidden = false;
  });
});
