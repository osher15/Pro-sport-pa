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
    args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type()==='error' && !/favicon/.test(m.text())) errs.push(m.text()); });
  await p.goto('' + BASE + '/index.html', { waitUntil: 'networkidle' });
  await p.waitForSelector('#menu:not([hidden])', { timeout: 10000 });
  const cards = await p.$$('.char-card');
  console.log('2D cards:', cards.length);
  await cards[0].click();
  await p.waitForTimeout(2500);
  const st = await p.evaluate(() => {
    const g = window.game || null;
    const sc = window.Phaser && window.Phaser.Game ? null : null;
    return { inMatch: document.body.classList.contains('in-match'),
             canvas: !!document.querySelector('#game-root canvas'),
             feed: document.querySelectorAll('#voice-feed .voice-line, .voice-line').length };
  });
  console.log('2D state:', JSON.stringify(st));
  await p.keyboard.down('KeyD'); await p.waitForTimeout(900); await p.keyboard.up('KeyD');
  await p.keyboard.press('KeyJ'); await p.waitForTimeout(600);
  await p.screenshot({ path: SHOTS + '/2d-regression.png' });
  console.log('2D errors:', errs.length ? errs : 'none');
  await b.close();
})();
