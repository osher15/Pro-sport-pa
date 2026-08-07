#!/usr/bin/env node
/**
 * Bundles the whole prototype into one self-contained HTML file.
 *
 *   node tools/build-single.js [out.html]
 *
 * Everything the game loads at runtime — the engine, the styles, every script,
 * the character data and the sprite PNGs — is inlined, so the result runs from
 * a single file with no server and no network. That is what makes it
 * publishable as a shareable link.
 *
 * The sprites become data URIs and the foot-anchor report becomes a global, so
 * the two things that normally arrive over HTTP still reach the game.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');

const SCRIPTS = [
  'src/core/combat.js',
  'src/game/textures.js',
  'src/game/ultimates.js',
  'src/game/Fighter.js',
  'src/game/controllers.js',
  'src/game/hud.js',
  'src/game/ArenaScene.js',
  'src/main.js'
];

function dataUri(relPath) {
  const buf = fs.readFileSync(path.join(root, relPath));
  return 'data:image/png;base64,' + buf.toString('base64');
}

/** Character data with every sprite path swapped for an inline data URI. */
function buildCharacterData() {
  const data = JSON.parse(read('data/characters.json'));
  data.characters.forEach((c) => {
    if (c.sprite) {
      c.spriteFile = c.sprite.split('/').pop();   // anchors are keyed by filename
      c.sprite = dataUri(c.sprite);
    }
  });
  return data;
}

function build() {
  const html = read('index.html');
  const body = html.slice(html.indexOf('<body>') + 6, html.indexOf('</body>'));

  // strip the tags that only make sense when files are served separately
  let markup = body
    .replace(/<script[\s\S]*?<\/script>/g, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .trim();

  const characters = buildCharacterData();
  const anchors = JSON.parse(read('art/sprites/dekey-report.json'));

  const out = [
    '<title>BrawlZ: Cursed Arenas</title>',
    '<style>\n' + read('css/game.css') + '\n</style>',
    markup,
    '<script>\n' + read('vendor/phaser.min.js') + '\n</script>',
    '<script>window.BRAWLZ_SINGLE_FILE = true;',
    'window.BRAWLZ_CHARACTERS_FALLBACK = ' + JSON.stringify(characters) + ';',
    'window.BRAWLZ_SPRITE_META = ' + JSON.stringify(anchors.map(
      (a) => ({ file: a.file, anchor: a.anchor })
    )) + ';</script>',
    ...SCRIPTS.map((f) => '<script>\n' + read(f) + '\n</script>')
  ].join('\n\n');

  const target = process.argv[2] || path.join(root, 'dist', 'brawlz-single.html');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, out, 'utf8');

  const mb = (Buffer.byteLength(out) / 1024 / 1024).toFixed(2);
  console.log(`wrote ${target} (${mb} MB, ${characters.characters.length} characters)`);
}

build();
