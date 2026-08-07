/**
 * Boot for the 3D build: load the roster, the arenas and the cores, draw the
 * three-step select, run a match, record the result.
 *
 * The 2D build stays exactly where it is (index.html). This is a second front
 * end over the same design data and the same combat core.
 */
import { Game3D } from './game.js';
import { Hud3D } from './hud.js';
import * as Save from '../core/save.js';

const state = {
  data: null,
  arenas: null,
  cores: null,
  profile: null,
  game: null,
  hud: null,
  playerId: null,
  arenaId: null,
  coreId: 'core_none'
};

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
 * What ships inside the offline bundle, so a file:// open still gets a playable
 * match instead of an error page.
 */
function builtinArenas() {
  return {
    arenas: [{
      id: 'arena_mine',
      name: 'Gold Mine',
      name_he: 'מכרה הזהב',
      blurb_he: 'הזירה הקלאסית.',
      grid: window.BrawlZ.DEFAULT_MAP,
      tile: window.BrawlZ.MAP_TILE,
      art: null,
      palette: {},
      hazards: []
    }]
  };
}

function builtinCores() {
  return { cores: [{ id: 'core_none', name: 'No Core', name_he: 'ללא ליבה', glyph: '○',
                     tint: '#9a94b3', blurb_he: 'הדמות כמו שהיא.', style_he: 'בסיס', stats: {} }] };
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/* ---------------- menu ---------------- */

function renderMenu() {
  document.getElementById('menu-title').textContent = state.data.game_title;
  document.getElementById('menu-version').textContent = state.data.version + ' · 3D';

  renderArenas();
  renderCores();
  renderCharacters();
  renderRecord();

  selectArena(state.profile.lastArena || state.arenas.arenas[0].id);
  selectCore(state.coreId);
}

function renderArenas() {
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

function renderCores() {
  const list = document.getElementById('core-list');
  list.innerHTML = '';
  state.cores.cores.forEach((core) => {
    const card = document.createElement('button');
    card.className = 'core-card';
    card.type = 'button';
    card.dataset.core = core.id;
    card.style.setProperty('--tint', core.tint || '#9a94b3');
    card.innerHTML =
      '<span class="core-glyph">' + esc(core.glyph || '○') + '</span>' +
      '<b class="core-name">' + esc(core.name_he || core.name) + '</b>' +
      '<span class="core-style">' + esc(core.style_he || '') + '</span>' +
      '<span class="core-blurb">' + esc(core.blurb_he || '') + '</span>' +
      '<span class="core-stats">' + statDeltas(core) + '</span>';
    card.addEventListener('click', () => selectCore(core.id));
    list.appendChild(card);
  });
}

/**
 * Turns the multipliers into readable "+20% מהירות" chips. Showing the actual
 * trade-off is the whole point — a Core that only says "mobility build" makes
 * the player guess what it cost them.
 */
function statDeltas(core) {
  const labels = {
    hp: 'חיים', speed: 'מהירות', damage: 'נזק', reach: 'טווח',
    cooldown: 'קצב', ammo: 'תחמושת', reload: 'טעינה', ultRadius: 'רדיוס אולטי'
  };
  const out = [];
  for (const [key, mod] of Object.entries(core.stats || {})) {
    if (!mod || mod.mul == null) continue;
    // Lower is better for reload and cooldown, so flip the sign of the read.
    const inverted = key === 'reload' || key === 'cooldown';
    const pct = Math.round((mod.mul - 1) * 100);
    if (!pct) continue;
    const good = inverted ? pct < 0 : pct > 0;
    const shown = inverted ? -pct : pct;
    // The number, its sign and the percent belong together as one LTR run;
    // without the isolation the minus jumps to the far side inside Hebrew text.
    out.push('<i class="delta ' + (good ? 'up' : 'down') + '">' +
      '<bdi dir="ltr">' + (shown > 0 ? '+' : '') + shown + '%</bdi> ' +
      esc(labels[key] || key) + '</i>');
  }
  return out.join('');
}

function renderCharacters() {
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
}

function renderRecord() {
  const r = state.profile.record;
  const total = r.wins + r.losses + r.draws;
  document.getElementById('record').textContent = total
    ? 'מאזן: ' + r.wins + ' נצחונות · ' + r.losses + ' הפסדים' + (r.draws ? ' · ' + r.draws + ' תיקו' : '')
    : '';
}

function stat(label, value) {
  return '<div><dt>' + label + '</dt><dd><bdi>' + esc(String(value)) + '</bdi></dd></div>';
}

function selectArena(id) {
  const found = state.arenas.arenas.find((a) => a.id === id);
  state.arenaId = found ? id : state.arenas.arenas[0].id;
  document.querySelectorAll('.arena-card').forEach((card, i) => {
    card.classList.toggle('is-picked', state.arenas.arenas[i].id === state.arenaId);
  });
  state.profile.lastArena = state.arenaId;
  Save.save(state.profile);
}

function selectCore(id) {
  const found = state.cores.cores.find((c) => c.id === id);
  state.coreId = found ? id : 'core_none';
  document.querySelectorAll('.core-card').forEach((card) => {
    card.classList.toggle('is-picked', card.dataset.core === state.coreId);
  });
}

/* ---------------- match ---------------- */

function currentArena() {
  return state.arenas.arenas.find((a) => a.id === state.arenaId) || state.arenas.arenas[0];
}

function coreDef(id) {
  return state.cores.cores.find((c) => c.id === id) || null;
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

  // The chosen Core belongs to the character, so switching back to them later
  // brings their build with them.
  Save.setCore(state.profile, playerId, state.coreId);
  state.profile.lastCharacter = playerId;
  Save.save(state.profile);

  const arena = currentArena();
  document.getElementById('hud-arena-name').textContent = arena.name_he || arena.name;

  state.game = new Game3D({
    canvas: document.getElementById('game-canvas'),
    roster,
    playerId,
    enemyId,
    arena,
    cores: state.cores.cores,
    playerCoreId: state.coreId,
    hud: state.hud,
    onMatchEnd: (result) => {
      Save.recordResult(state.profile,
        result.winner === null ? 'draw' : (result.winner === 0 ? 'win' : 'loss'));
      renderRecord();
    }
  });
  state.hud.setCoreBadges(state.game.playerCore, state.game.enemyCore);
  state.game.start();

  // Debug handle: lets the browser test harness read live scene state (joint
  // angles, positions, camera) instead of guessing from screenshots.
  window.__brawlz3d = state.game;
}

function backToMenu() {
  if (state.game) { state.game.destroy(); state.game = null; }
  state.hud.reset();
  document.body.classList.remove('in-match');
}

window.addEventListener('load', () => {
  state.hud = new Hud3D();
  state.profile = Save.load();

  const again = () => { if (state.playerId) startMatch(state.playerId); };
  document.getElementById('btn-menu').addEventListener('click', backToMenu);
  document.getElementById('btn-rematch').addEventListener('click', again);
  document.getElementById('btn-again').addEventListener('click', again);
  document.getElementById('btn-back').addEventListener('click', backToMenu);

  Promise.all([
    loadJson('data/characters.json', window.BRAWLZ_CHARACTERS_FALLBACK),
    loadJson('data/arenas.json', builtinArenas()),
    loadJson('data/cores.json', builtinCores())
  ]).then(([data, arenas, cores]) => {
    state.data = data;
    state.arenas = arenas;
    state.cores = cores;
    state.coreId = Save.coreFor(state.profile, state.profile.lastCharacter || '');
    renderMenu();
    document.getElementById('menu').hidden = false;
  }).catch((err) => {
    console.error('[BrawlZ3D] failed to load game data', err);
    document.getElementById('boot-error').hidden = false;
  });
});
