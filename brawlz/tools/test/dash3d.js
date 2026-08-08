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
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.goto('' + BASE + '/3d.html', { waitUntil: 'networkidle' });
  await p.waitForSelector('#menu:not([hidden])');

  const testUlt = async (charIndex, label) => {
    await p.goto('' + BASE + '/3d.html', { waitUntil: 'networkidle' });
    await p.waitForSelector('#menu:not([hidden])');
    await (await p.$$('.arena-card'))[0].click();
    await (await p.$$('.core-card'))[0].click();   // no core, so ult numbers are unmodified
    await (await p.$$('.char-card'))[charIndex].click();
    await p.waitForTimeout(700);
    const r = await p.evaluate(() => {
      const g = window.__brawlz3d;
      g.stop();
      const a = g.player.actor, e = g.enemy.actor;
      // Clear corridor along row y=40, enemy planted mid-path to the right.
      a.x = 200; a.y = 40; e.x = 420; e.y = 40;
      a.aim = 0; a.superCharge = 1; a.busyTimer = 0;
      a.hp = a.maxHp; e.hp = e.maxHp; e.invulnerableFor = 0;
      g.player.vx = g.player.vy = 0; g.enemy.vx = g.enemy.vy = 0;
      const startX = a.x, eHp = e.hp;
      const payload = g.castUltimate(g.player);
      for (let i = 0; i < 120; i++) { g.enemy.desired = null; g.update(1 / 60); }
      const ult = a.ultimate;
      return {
        ult: ult.name,
        radiusUsed: Math.round(payload.radius), radiusJson: ult.radius,
        dashed: Math.round(a.x - startX),
        intended: ult.dash_speed ? Math.round(ult.dash_speed * (ult.dash_time / 1000)) : null,
        enemyDamaged: Math.round(eHp - e.hp),
        ultDamage: payload ? payload.damage : null,
        superAfter: +a.superCharge.toFixed(2),
        enemyKnockedTo: Math.round(e.x)
      };
    });
    console.log(label.padEnd(18), JSON.stringify(r));
  };

  for (let i = 0; i < 6; i++) await testUlt(i, 'char ' + (i + 1));
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
