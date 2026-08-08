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
  await p.goto('' + BASE + '/tools/gait-bench.html', { waitUntil: 'networkidle' });
  await p.waitForFunction('window.__ready === true');
  for (const speed of [90, 190, 280]) {
    const r = await p.evaluate((s) => window.slipTest(s, 8), speed);
    console.log('speed', String(speed).padStart(3),
      '| avg slip per planted foot:', String(r.avgSlip).padStart(6),
      '| body moved during it:', String(r.avgBodyMoved).padStart(6),
      '| planted foot Y range:', r.minFootY, '..', r.maxFootY);
  }
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
