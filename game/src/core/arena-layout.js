/**
 * The arena layout — the single source of truth for both builds.
 *
 * A map is data, not code: a grid of characters, mirrored left-to-right so both
 * sides get the same ground.
 *   #  wall        .  open
 *   *  bush        A  team A spawn        B  team B spawn
 *
 * The 2D build (src/game/arena-map.js) and the 3D build (src/three/grid.js)
 * both read this, so a change to the arena only has to happen once.
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

  BrawlZ.MAP_TILE = TILE;
  BrawlZ.DEFAULT_MAP = DEFAULT_MAP;
})(typeof window !== 'undefined' ? window : globalThis);
