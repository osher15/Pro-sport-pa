/**
 * Procedurally generated placeholder art — no image assets required, so the
 * prototype runs straight from disk. Swap makeFighterTexture() for real
 * spritesheets when the art from the GDD moodboard is ready.
 */
(function (global) {
  'use strict';
  var BrawlZ = (global.BrawlZ = global.BrawlZ || {});

  var SIZE = 96;

  function makeFighterTexture(scene, key, theme, isRanged) {
    if (scene.textures.exists(key)) return key;

    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    var c = SIZE / 2;

    // drop shadow
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(c, SIZE - 8, 54, 14);

    // ears / hat silhouette so the two characters read differently
    g.fillStyle(Phaser.Display.Color.HexStringToColor(theme.body).color, 1);
    if (isRanged) {
      g.fillTriangle(c - 26, 30, c + 26, 30, c, -4);        // headscarf
    } else {
      g.fillEllipse(c - 15, 16, 14, 30);                      // kangaroo ears
      g.fillEllipse(c + 15, 16, 14, 30);
    }

    // body
    g.fillCircle(c, c + 4, 32);
    g.lineStyle(4, Phaser.Display.Color.HexStringToColor(theme.accent).color, 1);
    g.strokeCircle(c, c + 4, 32);

    // hair / trim
    g.fillStyle(Phaser.Display.Color.HexStringToColor(theme.trim).color, 1);
    g.fillEllipse(c, c - 18, 46, 20);

    // eyes
    g.fillStyle(0xffffff, 1);
    g.fillCircle(c - 11, c + 2, 9);
    g.fillCircle(c + 11, c + 2, 9);
    g.fillStyle(0x141018, 1);
    g.fillCircle(c - 9, c + 3, 4.5);
    g.fillCircle(c + 13, c + 3, 4.5);

    // gloves (melee) / a knitting needle (ranged) as a facing hint
    g.fillStyle(Phaser.Display.Color.HexStringToColor(theme.accent).color, 1);
    if (isRanged) {
      g.fillRect(c + 24, c + 6, 22, 5);
    } else {
      g.fillCircle(c + 30, c + 14, 11);
    }

    g.generateTexture(key, SIZE, SIZE);
    g.destroy();
    return key;
  }

  function makeCircleTexture(scene, key, radius, colorHex, alpha) {
    if (scene.textures.exists(key)) return key;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(Phaser.Display.Color.HexStringToColor(colorHex).color, alpha == null ? 1 : alpha);
    g.fillCircle(radius, radius, radius);
    g.lineStyle(3, 0xffffff, 0.55);
    g.strokeCircle(radius, radius, radius - 1);
    g.generateTexture(key, radius * 2, radius * 2);
    g.destroy();
    return key;
  }

  function makeArenaTexture(scene, key) {
    if (scene.textures.exists(key)) return key;
    var tile = 64;
    var g = scene.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1b1730, 1);
    g.fillRect(0, 0, tile, tile);
    g.lineStyle(2, 0x2e2750, 1);
    g.strokeRect(0, 0, tile, tile);
    g.fillStyle(0x272144, 1);
    g.fillCircle(tile / 2, tile / 2, 3);
    g.generateTexture(key, tile, tile);
    g.destroy();
    return key;
  }

  BrawlZ.Textures = {
    SIZE: SIZE,
    makeFighterTexture: makeFighterTexture,
    makeCircleTexture: makeCircleTexture,
    makeArenaTexture: makeArenaTexture
  };
})(typeof window !== 'undefined' ? window : globalThis);
