#!/usr/bin/env node
/**
 * Bundles the 3D build into one self-contained HTML file.
 *
 * The game normally loads a dozen ES modules, three JSON files and three PNGs
 * over HTTP. A page that has to run from a single file — an artifact link, an
 * email attachment, a phone with no server — can do none of that.
 *
 * So: esbuild flattens the module graph to one classic script with no imports
 * at all (which also sidesteps every content-security-policy question about
 * data: and blob: module URLs), the JSON is inlined as a global the loader
 * checks before it reaches for fetch, and the tile art becomes data URIs.
 *
 * Usage:  node tools/build-3d-single.js [out.html]
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || path.join(ROOT, 'brawlz-3d.html');

const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

function dataUri(relPath) {
  const abs = path.join(ROOT, relPath);
  if (!fs.existsSync(abs)) return null;
  const ext = path.extname(abs).slice(1).toLowerCase();
  const mime = ext === 'jpg' ? 'image/jpeg' : 'image/' + ext;
  return 'data:' + mime + ';base64,' + fs.readFileSync(abs).toString('base64');
}

async function main() {
  const esbuild = require(path.join(
    process.env.BRAWLZ_ESBUILD ||
    '/tmp/claude-0/-home-user-Pro-sport-pa/12fcaef8-ebf3-54c0-bafd-0a459acc6518/scratchpad/node_modules',
    'esbuild'
  ));

  /* ---- the module graph, flattened ---- */
  const bundle = await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/three/main.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: ['es2020'],
    legalComments: 'none'
  });
  const gameJs = bundle.outputFiles[0].text;

  /* ---- data, with the tile art swapped for data URIs ---- */
  const characters = readJson('data/characters.json');
  const cores = readJson('data/cores.json');
  const arenas = readJson('data/arenas.json');

  // Four arenas share the same three tiles. Inlining each reference separately
  // would embed a megabyte of base64 four times over, so every distinct file is
  // encoded once into a variable and the JSON just points at it.
  const tileVars = new Map();
  for (const arena of arenas.arenas) {
    if (!arena.art) continue;
    for (const key of Object.keys(arena.art)) {
      const rel = arena.art[key];
      if (!tileVars.has(rel)) {
        const uri = dataUri(rel);
        tileVars.set(rel, uri ? { name: 't' + tileVars.size, uri } : null);
      }
      const entry = tileVars.get(rel);
      if (entry) arena.art[key] = '@@TILE:' + entry.name + '@@';
      else delete arena.art[key];
    }
  }
  const tiles = [...tileVars.values()].filter(Boolean);

  const inline = {
    'data/characters.json': characters,
    'data/arenas.json': arenas,
    'data/cores.json': cores
  };

  const tileDecls = tiles.map((t) => 'var ' + t.name + '=' + JSON.stringify(t.uri) + ';').join('\n');
  const inlineJs = JSON.stringify(inline)
    .replace(/"@@TILE:(t\d+)@@"/g, (_, name) => name);

  /* ---- the page shell, lifted straight out of 3d.html ---- */
  const page = read('3d.html');
  const body = page.slice(page.indexOf('<body>') + 6, page.indexOf('<script'));

  const html = `<title>BrawlZ: Cursed Arenas — 3D</title>
<style>
${read('css/game3d.css')}
/* The artifact host supplies its own page skeleton, so the full-bleed sizing
   the standalone page gets from html,body has to be re-established here. */
html, body { margin: 0; padding: 0; height: 100%; overflow: hidden; }
</style>
<div dir="rtl" id="brawlz-root">
${body}
</div>
<script>
window.BRAWLZ_SINGLE_FILE = true;
${tileDecls}
window.BRAWLZ_INLINE_DATA = ${inlineJs};
</script>
<script>
${read('src/core/combat.js')}
</script>
<script>
${read('src/core/arena-layout.js')}
</script>
<script>
${gameJs}
</script>
`;

  fs.writeFileSync(OUT, html);
  const kb = (Buffer.byteLength(html) / 1024).toFixed(0);
  console.log('wrote ' + path.relative(ROOT, OUT) + '  (' + kb + ' KB)');
  console.log('  bundled script : ' + (Buffer.byteLength(gameJs) / 1024).toFixed(0) + ' KB');
  console.log('  characters     : ' + characters.characters.length);
  console.log('  arenas         : ' + arenas.arenas.length);
  console.log('  cores          : ' + cores.cores.length);
  console.log('  embedded tiles : ' + tiles.length + ' unique (' +
    (tiles.reduce((a, t) => a + t.uri.length, 0) / 1024 / 1024).toFixed(2) + ' MB)');
}

main().catch((err) => { console.error(err); process.exit(1); });
