/**
 * Local save.
 *
 * Small on purpose. Right now it holds the least a player would be annoyed to
 * lose — which Core they had equipped on which character, and their record —
 * but the shape is the one a server-backed profile would use later, so moving
 * it behind an account is a change of transport, not of format.
 *
 * Everything degrades to defaults if storage is unavailable (private browsing,
 * a file:// open), because a game that refuses to start because it cannot save
 * is worse than a game that forgets.
 */

const KEY = 'brawlz.profile.v1';

const EMPTY = {
  version: 1,
  cores: {},            // characterId -> coreId
  unlockedCores: ['core_none', 'core_fire', 'core_gravity', 'core_shadow'],
  record: { wins: 0, losses: 0, draws: 0 },
  lastArena: null,
  lastCharacter: null
};

function storage() {
  try {
    const s = window.localStorage;
    const probe = '__brawlz__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch (err) {
    return null;
  }
}

export function load() {
  const s = storage();
  if (!s) return { ...EMPTY, cores: {}, record: { ...EMPTY.record } };
  try {
    const raw = s.getItem(KEY);
    if (!raw) return { ...EMPTY, cores: {}, record: { ...EMPTY.record } };
    const parsed = JSON.parse(raw);
    // Merge rather than trust: a save written by an older build is missing keys
    // a newer one reads, and a half-populated profile crashes at the worst time.
    return {
      ...EMPTY,
      ...parsed,
      cores: { ...parsed.cores },
      record: { ...EMPTY.record, ...parsed.record },
      unlockedCores: parsed.unlockedCores || EMPTY.unlockedCores
    };
  } catch (err) {
    console.warn('[BrawlZ] save unreadable, starting fresh —', err.message);
    return { ...EMPTY, cores: {}, record: { ...EMPTY.record } };
  }
}

export function save(profile) {
  const s = storage();
  if (!s) return false;
  try {
    s.setItem(KEY, JSON.stringify(profile));
    return true;
  } catch (err) {
    console.warn('[BrawlZ] could not save —', err.message);
    return false;
  }
}

export function setCore(profile, characterId, coreId) {
  profile.cores[characterId] = coreId;
  save(profile);
  return profile;
}

export function coreFor(profile, characterId) {
  return profile.cores[characterId] || 'core_none';
}

export function recordResult(profile, outcome) {
  if (outcome === 'win') profile.record.wins += 1;
  else if (outcome === 'loss') profile.record.losses += 1;
  else profile.record.draws += 1;
  save(profile);
  return profile;
}
