/**
 * The map layer: walls and bushes.
 *
 * This is what turns an empty rectangle into an arena. Walls block movement and
 * stop projectiles, so there is cover to use and angles to cut. Bushes hide a
 * fighter from anyone standing more than a couple of tiles away, which is where
 * the ambushes come from.
 *
 * Maps are data, not code: a grid of characters, mirrored left-to-right so both
 * sides get the same ground.
 *   #  wall        .  open
 *   *  bush        A  team A spawn        B  team B spawn
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  var TILE = 80;

  /** 20 x 11 tiles at 80px = the 1600x900 world. Symmetric by construction. */
  var DEFAULT_MAP = [
    '....................',
    '..**....####....**..',
    '..**....#..#....**..',
    '.A......#..#......B.',
    '....##..........##..',
    '..*...####..####...*',
    '....##..........##..',
    '.A......#..#......B.',
    '..**....#..#....**..',
    '..**....####....**..',
    '....................'
  ];

  /** How far away a bush stops hiding you (matches "two tiles" in the genre). */
  var BUSH_REVEAL_RANGE = TILE * 2;

  function ArenaMap(scene, rows) {
    this.scene = scene;
    this.rows = rows || DEFAULT_MAP;
    this.tile = TILE;
    this.walls = scene.physics.add.staticGroup();
    this.bushes = [];
    this.spawns = { 0: [], 1: [] };

    this.build();
  }

  ArenaMap.prototype.build = function () {
    var scene = this.scene;
    var t = this.tile;

    // ground first, so everything else sits on top of it
    var floor = scene.add.graphics().setDepth(0);
    for (var gy = 0; gy < this.rows.length; gy++) {
      for (var gx = 0; gx < this.rows[gy].length; gx++) {
        var shade = (gx + gy) % 2 === 0 ? 0x1d1936 : 0x211c3d;
        floor.fillStyle(shade, 1);
        floor.fillRect(gx * t, gy * t, t, t);
      }
    }

    for (var y = 0; y < this.rows.length; y++) {
      var row = this.rows[y];
      for (var x = 0; x < row.length; x++) {
        var cx = x * t + t / 2;
        var cy = y * t + t / 2;
        var ch = row[x];

        if (ch === '#') this.addWall(cx, cy);
        else if (ch === '*') this.addBush(cx, cy);
        else if (ch === 'A') this.spawns[0].push({ x: cx, y: cy });
        else if (ch === 'B') this.spawns[1].push({ x: cx, y: cy });
      }
    }
  };

  ArenaMap.prototype.addWall = function (cx, cy) {
    var t = this.tile;
    var scene = this.scene;

    // A crate read from above: dark base, lit top face, plank seams. Flat
    // squares make the arena look like a wireframe, and this costs nothing.
    var g = scene.add.graphics().setDepth(4);
    g.fillStyle(0x241f45, 1);
    g.fillRoundedRect(cx - t / 2 + 3, cy - t / 2 + 8, t - 6, t - 11, 7);   // base
    g.fillStyle(0x4a3f7d, 1);
    g.fillRoundedRect(cx - t / 2 + 3, cy - t / 2 + 2, t - 6, t - 16, 7);   // top face
    g.lineStyle(3, 0x6b5bb0, 1);
    g.strokeRoundedRect(cx - t / 2 + 3, cy - t / 2 + 2, t - 6, t - 16, 7);
    g.lineStyle(2, 0x362e60, 0.9);
    g.beginPath();
    g.moveTo(cx - t / 2 + 10, cy - 6);
    g.lineTo(cx + t / 2 - 10, cy - 6);
    g.strokePath();

    // invisible body — the graphics above are the visible wall
    var block = scene.add.rectangle(cx, cy, t - 4, t - 8, 0x000000, 0);
    scene.physics.add.existing(block, true);
    this.walls.add(block);
  };

  ArenaMap.prototype.addBush = function (cx, cy) {
    var t = this.tile;
    var scene = this.scene;

    // A clump of overlapping blobs reads as foliage; one flat circle does not.
    var g = scene.add.graphics().setDepth(20);
    var blobs = [
      [-18, 6, 26], [18, 6, 26], [0, -10, 30], [-10, 16, 20], [12, 16, 20]
    ];
    g.fillStyle(0x1f5c33, 1);
    blobs.forEach(function (b) { g.fillCircle(cx + b[0], cy + b[1] + 4, b[2]); });
    g.fillStyle(0x2f7a45, 1);
    blobs.forEach(function (b) { g.fillCircle(cx + b[0], cy + b[1], b[2]); });
    g.fillStyle(0x46a05c, 0.85);
    g.fillCircle(cx - 8, cy - 14, 13);
    g.fillCircle(cx + 14, cy - 4, 9);

    // an invisible ellipse keeps the concealment maths simple and readable
    var probe = scene.add.ellipse(cx, cy, t - 4, t - 12, 0x000000, 0);
    this.bushes.push(probe);
  };

  ArenaMap.prototype.spawnPoint = function (team, index) {
    var list = this.spawns[team] || [];
    if (!list.length) return { x: 300, y: 450 };
    return list[index % list.length];
  };

  /** Walls block bodies: fighters collide, projectiles are destroyed. */
  ArenaMap.prototype.attachCollisions = function (fighters, projectileGroup, onProjectileBlocked) {
    var self = this;
    fighters.forEach(function (f) {
      self.scene.physics.add.collider(f.sprite, self.walls);
    });
    this.scene.physics.add.collider(projectileGroup, this.walls, function (a, b) {
      var projectile = a && a.meta ? a : b;
      if (projectile && projectile.meta) onProjectileBlocked(projectile);
    });
  };

  /**
   * A fighter standing in a bush is hidden from anyone further than two tiles.
   * Returns true when this fighter should be drawn to the local player.
   */
  ArenaMap.prototype.isConcealed = function (fighter, viewer) {
    if (!viewer || fighter === viewer) return false;

    var inBush = this.bushAt(fighter.sprite.x, fighter.sprite.y);
    if (!inBush) return false;

    var dx = fighter.sprite.x - viewer.sprite.x;
    var dy = fighter.sprite.y - viewer.sprite.y;
    return Math.sqrt(dx * dx + dy * dy) > BUSH_REVEAL_RANGE;
  };

  ArenaMap.prototype.bushAt = function (x, y) {
    for (var i = 0; i < this.bushes.length; i++) {
      var b = this.bushes[i];
      var dx = (x - b.x) / (b.width / 2);
      var dy = (y - b.y) / (b.height / 2);
      if (dx * dx + dy * dy <= 1) return b;
    }
    return null;
  };

  /** True when a straight line between two points crosses a wall tile. */
  ArenaMap.prototype.blocksLine = function (x1, y1, x2, y2) {
    var steps = Math.ceil(Math.hypot(x2 - x1, y2 - y1) / (this.tile / 2));
    for (var i = 1; i < steps; i++) {
      var t = i / steps;
      if (this.isWallAt(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t)) return true;
    }
    return false;
  };

  ArenaMap.prototype.isWallAt = function (x, y) {
    var gx = Math.floor(x / this.tile);
    var gy = Math.floor(y / this.tile);
    if (gy < 0 || gy >= this.rows.length) return false;
    if (gx < 0 || gx >= this.rows[gy].length) return false;
    return this.rows[gy][gx] === '#';
  };

  BrawlZ.ArenaMap = ArenaMap;
  BrawlZ.MAP_TILE = TILE;
  BrawlZ.DEFAULT_MAP = DEFAULT_MAP;
})(typeof window !== 'undefined' ? window : globalThis);
