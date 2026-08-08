const { chromium } = require('playwright');
const path = require('path');
/* Shared harness settings. Override with env vars:
     BRAWLZ_URL   base url of a server serving the brawlz folder
     BRAWLZ_EXE   path to a Chromium binary
     BRAWLZ_SHOTS where screenshots go                                    */
const BASE = process.env.BRAWLZ_URL || 'http://localhost:8123';
const EXE = process.env.BRAWLZ_EXE || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const ROOT = path.join(__dirname, '..', '..');
const SHOTS = process.env.BRAWLZ_SHOTS || path.join(ROOT, 'tools', 'test', 'shots');
require('fs').mkdirSync(SHOTS, { recursive: true });


(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args: ['--no-sandbox'] });
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('' + BASE + '/tools/audio-bench.html', { waitUntil: 'networkidle' });
  await p.waitForFunction('window.__ready === true');
  const rows = await p.evaluate(() => window.renderAll());
  console.log('name          played  peak    rms     start  dur    clipped');
  let silent = 0, clipped = 0;
  for (const r of rows) {
    if (r.peak < 0.005) silent++;
    if (r.clipped) clipped++;
    console.log(
      r.name.padEnd(13),
      String(r.played).padEnd(7),
      String(r.peak).padEnd(7),
      String(r.rms).padEnd(7),
      String(r.startMs + 'ms').padEnd(6),
      String(r.durMs + 'ms').padEnd(6),
      r.clipped ? 'CLIPPED' : '');
  }
  console.log('\nsounds:', rows.length, '| silent:', silent, '| clipped:', clipped);
  console.log('pitch shifts the tone:', JSON.stringify(await p.evaluate(() => window.pitchCheck())));
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
