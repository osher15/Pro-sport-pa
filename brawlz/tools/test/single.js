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


const fs = require('fs');
(async () => {
  const b = await chromium.launch({ executablePath: EXE,
    args: ['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'] });
  const p = await b.newPage({ viewport: { width: 900, height: 640 } });
  const errs = [];
  p.on('pageerror', e => errs.push('PAGEERROR: ' + e.message));
  p.on('console', m => { if (m.type()==='error') errs.push(m.text()); });
  p.on('requestfailed', r => errs.push('REQFAIL ' + r.url().slice(0,60)));

  // Wrapped exactly the way the artifact host wraps it: doctype, head, body.
  const body = fs.readFileSync(ROOT + '/brawlz-3d.html', 'utf8');
  await p.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body>' + body + '</body></html>',
                     { waitUntil: 'networkidle' });

  await p.waitForSelector('#menu:not([hidden])', { timeout: 15000 });
  console.log('menu   :', (await p.$$('.arena-card')).length, 'arenas,',
              (await p.$$('.core-card')).length, 'cores,',
              (await p.$$('.char-card')).length, 'characters');

  await (await p.$$('.arena-card'))[1].click();     // Meteor Yard
  await (await p.$$('.core-card'))[1].click();      // Fire Core
  await (await p.$$('.char-card'))[3].click();      // Cyber Shark
  await p.waitForTimeout(2000);

  const state = await p.evaluate(() => {
    const g = window.__brawlz3d;
    if (!g) return { ok: false };
    g.stop();
    for (let i = 0; i < 60 * 6; i++) g.update(1/60);
    g.player.actor.attackCooldown.trigger(0); g.player.actor.busyTimer = 0;
    g.fireAttack(g.player, 0);
    for (let i = 0; i < 30; i++) g.update(1/60);
    // are the tile textures actually decoded?
    let mapped = 0, loaded = 0;
    g.scene.traverse(o => {
      if (o.material && o.material.map) {
        mapped++;
        if (o.material.map.image && o.material.map.image.width) loaded++;
      }
    });
    return { ok: true, phase: g.match.phase, arena: g.arena.name_he,
             core: g.playerCore.id, projectiles: g.projectiles.length,
             shape: g.projectiles[0] && g.projectiles[0].shape,
             texturedMeshes: mapped, texturesDecoded: loaded,
             legs: g.player.rig.legs.length,
             audioOk: !!g.audio && typeof g.audio.play === 'function' };
  });
  console.log('running:', JSON.stringify(state));
  await p.screenshot({ path: SHOTS + '/single-3d.png' });
  console.log('ERRORS :', errs.length ? errs : 'none');
  console.log('size   :', (Buffer.byteLength(body)/1024/1024).toFixed(2), 'MB');
  await b.close();
})();
