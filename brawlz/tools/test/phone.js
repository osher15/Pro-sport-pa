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
  const errs = [];
  for (const [w, h, label] of [[900, 1550, 'portrait'], [1550, 760, 'landscape']]) {
    const p = await b.newPage({ viewport: { width: w, height: h } });
    p.on('pageerror', e => errs.push(label + ': ' + e.message));
    await p.goto('' + BASE + '/3d.html', { waitUntil: 'networkidle' });
    await p.waitForSelector('#menu:not([hidden])');
    await (await p.$$('.arena-card'))[3].click();   // Sky Rooftop, like his shot
    await (await p.$$('.core-card'))[3].click();
    await (await p.$$('.char-card'))[0].click();    // kangaroo
    await p.waitForTimeout(1200);

    const m = await p.evaluate(() => {
      const g = window.__brawlz3d;
      g.stop();
      for (let i = 0; i < 60 * 5; i++) g.update(1/60);
      g.player.actor.attackCooldown.trigger(0); g.player.actor.busyTimer = 0;
      g.enemy.actor.x = g.player.actor.x + 420; g.enemy.actor.y = g.player.actor.y;
      // how much arena is actually on screen?
      const V = Object.getPrototypeOf(g.camera.position).constructor;
      const probe = (wx, wz) => { const v = new V(wx, 0, wz); v.project(g.camera);
        return { x: (v.x*0.5+0.5)*innerWidth, y: (-v.y*0.5+0.5)*innerHeight }; };
      const a = probe(g.player.actor.x - 400, g.player.actor.y);
      const bb = probe(g.player.actor.x + 400, g.player.actor.y);
      const pxPer800 = Math.abs(bb.x - a.x);
      const spanX = 800 / pxPer800 * innerWidth;
      // how much of the frame is sky (nothing but background)?
      return { spanTiles: +(spanX / 80).toFixed(1),
               fov: g.camera.fov,
               camY: Math.round(g.camera.position.y),
               camZ: Math.round(g.camera.position.z - g.player.actor.y) };
    });
    console.log(label.padEnd(10), JSON.stringify(m));
    await p.waitForTimeout(200);
    await p.screenshot({ path: SHOTS + '/phone-' + label + '.png' });
    await p.close();
  }
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
