/**
 * Ultimate registry for the 3D build.
 *
 * Keyed by the ultimate's name in characters.json, so adding a character to the
 * data needs no change here — an unknown name falls back to a generic burst and
 * the character is still playable.
 *
 * Each handler receives ({ game, fighter, payload }) and is responsible for its
 * own damage resolution and visuals. Damage always goes through the combat core
 * so the rules stay in one place.
 */

/**
 * Leap forward and slam down.
 *
 * The swept test from launch point to landing point is the important part: a
 * dash fast enough to overshoot a nearby target would otherwise detonate behind
 * whoever it just flew over.
 */
function dashSlam(ctx) {
  const { game, fighter, payload } = ctx;
  const ult = payload.ultimate;
  const speed = ult.dash_speed || 1050;
  const time = (ult.dash_time || 320) / 1000;
  const angle = payload.aim;

  const startX = fighter.actor.x;
  const startY = fighter.actor.y;

  fighter.rig.play('cast', 0.45);
  game.beginDash(fighter, angle, speed, time, () => {
    const hits = game.system.resolveCapsule(
      fighter.actor, startX, startY, fighter.actor.x, fighter.actor.y,
      payload.radius, payload.damage,
      { knockback: ult.knockback || 0, source: 'ultimate' }
    );
    game.fx.shockwave(fighter.actor.x, fighter.actor.y, payload.radius, 0xffd166);
    game.fx.shake(0.35, 26);
    return hits;
  });
}

/** Burst of shards in a full ring, each one exploding where it lands. */
function radialBurst(ctx) {
  const { game, fighter, payload } = ctx;
  const ult = payload.ultimate;
  const shards = ult.shards || 10;
  const perShard = Math.round(payload.damage / Math.max(1, shards * 0.55));

  fighter.rig.play('cast', 0.45);
  game.fx.shockwave(fighter.actor.x, fighter.actor.y, payload.radius * 0.55, 0xff7ad9);
  game.fx.shake(0.2, 14);

  for (let i = 0; i < shards; i++) {
    const angle = payload.aim + (i / shards) * Math.PI * 2;
    game.spawnProjectile(fighter, {
      angle,
      speed: 620,
      radius: 16,
      damage: perShard,
      range: payload.radius * 2.6,
      aoeRadius: payload.radius * 0.55,
      knockback: (ult.knockback || 240) * 0.5,
      color: 0xff7ad9,
      kind: 'ultimate'
    });
  }
}

/** Shove everything nearby away, hard. */
function pushBurst(ctx) {
  const { game, fighter, payload } = ctx;
  fighter.rig.play('cast', 0.45);
  game.system.resolveAoe(
    fighter.actor, fighter.actor.x, fighter.actor.y, payload.radius, payload.damage,
    { knockback: payload.ultimate.knockback || 500, source: 'ultimate' }
  );
  game.fx.shockwave(fighter.actor.x, fighter.actor.y, payload.radius, 0xffe08a);
  game.fx.shake(0.3, 20);
}

export const ULTIMATES = {
  'Smash Punch': dashSlam,
  'Belly Flop': dashSlam,
  'Torpedo Dash': dashSlam,
  'Gren-Yarn': radialBurst,
  'Thorn Storm': radialBurst,
  'Quiet Hour': pushBurst,
  _default: pushBurst
};

export function runUltimate(game, fighter, payload) {
  const handler = ULTIMATES[payload.ultimate.name] || ULTIMATES._default;
  handler({ game, fighter, payload });
}
