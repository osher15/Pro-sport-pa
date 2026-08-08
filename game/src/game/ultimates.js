/**
 * Ultimate registry.
 *
 * Keyed by the ultimate's "name" in characters.json. The combat core never
 * imports these — it just emits the request and the fighter looks the name up
 * here, so a new character in the JSON works immediately (falling back to the
 * generic burst) and only needs an entry here when it wants bespoke behaviour.
 *
 * Signature: fn(scene, fighter, payload)
 *   payload = { actor, ultimate, damage, radius, aim }
 *
 * Numbers come from the JSON wherever a designer might want to tune them:
 *   damage, radius, knockback, shards, dash_speed, dash_time, projectile_speed
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  var Ultimates = {};

  /* ---------------------------------------------------------------- *
   * shared pieces
   * ---------------------------------------------------------------- */

  /** Leap forward, then detonate an AoE where you land. */
  function dashSlam(scene, fighter, payload) {
    var actor = payload.actor;
    var ult = payload.ultimate;
    var dashSpeed = ult.dash_speed || 1150;
    var dashTime = ult.dash_time || 300;
    var knock = ult.knockback || 600;

    scene.tweens.add({
      targets: fighter.art,
      scale: 1.45,
      duration: dashTime * 0.55,
      yoyo: true,
      ease: 'Sine.easeOut'
    });
    scene.cameras.main.shake(120, 0.004);

    var fromX = fighter.sprite.x;
    var fromY = fighter.sprite.y;

    fighter.dash(payload.aim, dashSpeed, dashTime, function () {
      if (!actor.alive) return;

      scene.shockwave(fighter.sprite.x, fighter.sprite.y, payload.radius, fighter.theme.accent);
      scene.cameras.main.shake(220, 0.012);

      // Swept along the leap, not just at the landing spot — a fast dash can
      // travel further than its own blast radius and would otherwise detonate
      // harmlessly behind the target it flew over.
      scene.combat.resolveCapsule(
        actor, fromX, fromY, fighter.sprite.x, fighter.sprite.y,
        payload.radius, payload.damage,
        { knockback: knock, source: 'ultimate' }
      );
    });
  }

  /** Spray N projectiles outwards from a point, splitting the damage. */
  function radialBurst(scene, fighter, payload, x, y, opts) {
    opts = opts || {};
    var actor = payload.actor;
    var shards = payload.ultimate.shards || 10;
    var shardDamage = Math.round(payload.damage / shards);

    scene.shockwave(x, y, payload.radius * 0.55, fighter.theme.accent);
    scene.cameras.main.shake(160, 0.006);

    for (var i = 0; i < shards; i++) {
      var angle = (Math.PI * 2 * i) / shards + Math.random() * 0.12;
      scene.spawnProjectile({
        owner: actor,
        x: x + Math.cos(angle) * 18,
        y: y + Math.sin(angle) * 18,
        angle: angle,
        speed: opts.speed || 430,
        radius: opts.radius || 9,
        damage: shardDamage,
        knockback: opts.knockback || 220,
        range: payload.radius * 2.4,
        aoeRadius: opts.aoeRadius || 46,
        color: fighter.theme.accent,
        label: 'shard'
      });
    }
  }

  /* ---------------------------------------------------------------- *
   * K.O. Kangaroo — "Smash Punch"
   * Jumps forward, deals AoE damage on landing, knocks everyone back.
   * ---------------------------------------------------------------- */
  Ultimates['Smash Punch'] = dashSlam;

  /** Sumo Sloth — same shape, slower and heavier (tuned from the JSON). */
  Ultimates['Belly Flop'] = dashSlam;

  /** Cyber Shark — a fast torpedo lunge. */
  Ultimates['Torpedo Dash'] = dashSlam;

  /* ---------------------------------------------------------------- *
   * Grandma Grenade — "Gren-Yarn"
   * Lobs a fat yarn ball that bursts into N explosive shards.
   * ---------------------------------------------------------------- */
  Ultimates['Gren-Yarn'] = function (scene, fighter, payload) {
    scene.spawnProjectile({
      owner: payload.actor,
      x: fighter.sprite.x + Math.cos(payload.aim) * 38,
      y: fighter.sprite.y + Math.sin(payload.aim) * 38,
      angle: payload.aim,
      speed: payload.ultimate.projectile_speed || 420,
      radius: 26,
      damage: 0,                    // the ball is a delivery system, not a hit
      knockback: 0,
      range: 420,
      color: fighter.theme.trim,
      spin: 6,
      label: 'yarn',
      onEnd: function (x, y) {      // fires on impact *or* at max range
        radialBurst(scene, fighter, payload, x, y);
      }
    });
  };

  /* ---------------------------------------------------------------- *
   * Cactus Kid — "Thorn Storm"
   * Same spray, but straight off the body — no delivery projectile.
   * ---------------------------------------------------------------- */
  Ultimates['Thorn Storm'] = function (scene, fighter, payload) {
    radialBurst(scene, fighter, payload, fighter.sprite.x, fighter.sprite.y, {
      speed: 520,
      radius: 8,
      aoeRadius: 34,
      knockback: 180
    });
  };

  /* ---------------------------------------------------------------- *
   * Sergeant Binky — "Quiet Hour"
   * A shout that shoves everything around him away.
   * ---------------------------------------------------------------- */
  Ultimates['Quiet Hour'] = function (scene, fighter, payload) {
    scene.shockwave(fighter.sprite.x, fighter.sprite.y, payload.radius, fighter.theme.accent);
    scene.cameras.main.shake(260, 0.014);
    scene.combat.resolveAoe(
      payload.actor, fighter.sprite.x, fighter.sprite.y, payload.radius, payload.damage,
      { knockback: payload.ultimate.knockback || 700, source: 'ultimate' }
    );
  };

  /* ---------------------------------------------------------------- *
   * Fallback for any character whose ultimate has no bespoke script yet.
   * ---------------------------------------------------------------- */
  Ultimates._default = function (scene, fighter, payload) {
    scene.shockwave(fighter.sprite.x, fighter.sprite.y, payload.radius, fighter.theme.accent);
    scene.cameras.main.shake(180, 0.008);
    scene.combat.resolveAoe(
      payload.actor, fighter.sprite.x, fighter.sprite.y, payload.radius, payload.damage,
      { knockback: 380, source: 'ultimate' }
    );
  };

  BrawlZ.Ultimates = Ultimates;
  BrawlZ.dashSlam = dashSlam;
  BrawlZ.radialBurst = radialBurst;
})(typeof window !== 'undefined' ? window : globalThis);
