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
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  var Ultimates = {};

  /* ---------------------------------------------------------------- *
   * K.O. Kangaroo — "Smash Punch"
   * Jumps forward, deals AoE damage on landing, knocks everyone back.
   * ---------------------------------------------------------------- */
  Ultimates['Smash Punch'] = function (scene, fighter, payload) {
    var actor = payload.actor;
    // ~345px of travel: far enough that a kited ranged target still gets
    // caught by the landing AoE (radius comes from characters.json).
    var dashSpeed = 1150;
    var dashTime = 300;                                   // ms
    var knock = payload.ultimate.knockback || 600;

    // "jump" = scale up and back down while airborne
    scene.tweens.add({
      targets: fighter.sprite,
      scale: 1.45,
      duration: dashTime * 0.55,
      yoyo: true,
      ease: 'Sine.easeOut'
    });
    scene.cameras.main.shake(120, 0.004);

    fighter.dash(payload.aim, dashSpeed, dashTime, function () {
      if (!actor.alive) return;

      scene.shockwave(fighter.sprite.x, fighter.sprite.y, payload.radius, fighter.theme.accent);
      scene.cameras.main.shake(220, 0.012);

      scene.combat.resolveAoe(actor, fighter.sprite.x, fighter.sprite.y, payload.radius, payload.damage, {
        knockback: knock,
        source: 'ultimate'
      });
    });
  };

  /* ---------------------------------------------------------------- *
   * Grandma Grenade — "Gren-Yarn"
   * Lobs a fat yarn ball that bursts into N explosive shards.
   * ---------------------------------------------------------------- */
  Ultimates['Gren-Yarn'] = function (scene, fighter, payload) {
    var actor = payload.actor;
    var shards = payload.ultimate.shards || 10;
    var shardDamage = Math.round(payload.damage / shards);

    function burst(x, y) {
      scene.shockwave(x, y, payload.radius * 0.55, fighter.theme.accent);
      scene.cameras.main.shake(160, 0.006);
      for (var i = 0; i < shards; i++) {
        var angle = (Math.PI * 2 * i) / shards + Math.random() * 0.12;
        scene.spawnProjectile({
          owner: actor,
          x: x + Math.cos(angle) * 18,
          y: y + Math.sin(angle) * 18,
          angle: angle,
          speed: 430,
          radius: 9,
          damage: shardDamage,
          knockback: 220,
          range: payload.radius * 2.4,
          aoeRadius: 46,
          color: fighter.theme.accent,
          label: 'shard'
        });
      }
    }

    scene.spawnProjectile({
      owner: actor,
      x: fighter.sprite.x + Math.cos(payload.aim) * 38,
      y: fighter.sprite.y + Math.sin(payload.aim) * 38,
      angle: payload.aim,
      speed: 420,
      radius: 26,
      damage: 0,                    // the ball is a delivery system, not a hit
      knockback: 0,
      range: 420,
      color: fighter.theme.trim,
      spin: 6,
      label: 'yarn',
      onEnd: burst                  // fires on impact *or* at max range
    });
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
})(typeof window !== 'undefined' ? window : globalThis);
