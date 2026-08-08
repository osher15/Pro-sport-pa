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

  const play = async (coreIdx, charIdx) => {
    await p.evaluate(() => { const g = window.__brawlz3d; if (g) g.destroy(); });
    await p.evaluate(() => document.getElementById('btn-menu').click());
    await p.waitForTimeout(120);
    await (await p.$$('.arena-card'))[0].click();
    await (await p.$$('.core-card'))[coreIdx].click();
    await (await p.$$('.char-card'))[charIdx].click();
    await p.waitForTimeout(650);
    await p.evaluate(() => { const g = window.__brawlz3d; g.stop(); for(let i=0;i<200;i++) g.update(1/60); });
  };

  // ---- gravity: reach up, damage down, hits slow the target ----
  await play(2, 3);
  console.log('GRAVITY', JSON.stringify(await p.evaluate(() => {
    const g = window.__brawlz3d, a = g.player.actor, e = g.enemy.actor;
    const before = { dmg: a.base.damage, reach: Math.round(a.base.reach), speed: Math.round(a.base.speed) };
    const after  = { dmg: a.damage, reach: Math.round(a.profile.reach), speed: Math.round(a.moveSpeed) };
    a.x=400; a.y=40; e.x=700; e.y=40; e.hp=e.maxHp; e.invulnerableFor=0;
    a.aim=0; a.attackCooldown.trigger(0); a.busyTimer=0; a.ammo=3;
    const enemyBaseSpeed = Math.round(e.moveSpeed);
    g.fireAttack(g.player, 0);
    for (let i=0;i<40;i++) { g.enemy.desired=null; g.update(1/60); }
    const slowed = Math.round(e.moveSpeed);
    const fx = e.effects.map(x=>x.id);
    for (let i=0;i<120;i++) { g.enemy.desired=null; g.update(1/60); }
    return { core: g.playerCore.id, before, after, enemyBaseSpeed, slowed,
             effects: fx, speedRecovered: Math.round(e.moveSpeed) };
  })));

  // ---- shadow: faster, frailer, vanishes when quiet ----
  await play(3, 3);
  console.log('SHADOW ', JSON.stringify(await p.evaluate(() => {
    const g = window.__brawlz3d, a = g.player.actor;
    const out = { core: g.playerCore.id,
      baseHp: a.base.hp, hp: a.maxHp,
      baseSpeed: Math.round(a.base.speed), speed: Math.round(a.moveSpeed),
      baseReload: a.base.reload, reload: +a.reloadTime.toFixed(2) };
    a.attackCooldown.trigger(0); a.busyTimer = 0; a.ammo = 3;
    g.fireAttack(g.player, 0);
    for (let i=0;i<30;i++) g.update(1/60);
    out.vanishedRightAfterFiring = !!a.vanished;
    for (let i=0;i<120;i++) g.update(1/60);       // 2s of quiet
    out.vanishedAfterQuiet = !!a.vanished;
    out.rigConcealed = g.player.hidden;
    g.fireAttack(g.player, 0);
    for (let i=0;i<10;i++) g.update(1/60);
    out.vanishedAfterFiringAgain = !!a.vanished;
    return out;
  })));

  // ---- no core: nothing changes ----
  await play(0, 3);
  console.log('NONE   ', JSON.stringify(await p.evaluate(() => {
    const a = window.__brawlz3d.player.actor;
    return { core: window.__brawlz3d.playerCore, hp: a.maxHp, base: a.base.hp,
             dmg: a.damage, baseDmg: a.base.damage, mods: a.mods.length };
  })));

  console.log('ERRORS:', errs.length ? errs : 'none');
  await b.close();
})();
