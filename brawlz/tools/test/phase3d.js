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
  await (await p.$$('.arena-card'))[0].click();
  await (await p.$$('.core-card'))[1].click();
  await (await p.$$('.char-card'))[3].click();
  await p.waitForTimeout(600);

  const step = (sec, setup) => p.evaluate(({sec, setup}) => {
    const g = window.__brawlz3d; g.stop();
    if (setup) eval(setup);
    for (let i=0;i<Math.round(sec*60);i++) g.update(1/60);
    const show = id => getComputedStyle(document.getElementById(id)).display !== 'none';
    return { phase: g.match.phase, clockEl: document.getElementById('hud-clock').textContent,
             score: g.match.score[0]+'-'+g.match.score[1],
             scoreEl: document.getElementById('hud-score-us').textContent + '-' +
                      document.getElementById('hud-score-them').textContent,
             resultShown: show('result'), countdownShown: show('hud-countdown'),
             title: document.getElementById('result-title').textContent };
  }, {sec, setup});

  console.log('kill DURING countdown :', JSON.stringify(await step(0.2,
    "g.system.applyDamage(g.player.actor, g.enemy.actor, 99999, {})")));
  console.log('past countdown, 30s   :', JSON.stringify(await step(33)));
  console.log('kill while live       :', JSON.stringify(await step(0.2,
    "g.enemy.actor.invulnerableFor=0; g.system.applyDamage(g.player.actor, g.enemy.actor, 99999, {})")));
  console.log('reach 5 kills         :', JSON.stringify(await step(0.5,
    "g.match.score[0]=4; g.enemy.actor.invulnerableFor=0; g.enemy.actor.alive=true; g.enemy.actor.hp=10;" +
    "g.system.applyDamage(g.player.actor, g.enemy.actor, 99999, {})")));
  await p.waitForTimeout(300);
  await p.screenshot({ path: SHOTS + '/m07-result.png' });

  console.log('profile saved         :', await p.evaluate(() =>
    localStorage.getItem('brawlz.profile.v1')));
  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
