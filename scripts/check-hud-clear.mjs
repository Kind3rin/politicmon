/** The top of the world screen, on the phone profiles at normal and large text, at three places on the antenna map: the centre, the top
 * edge (where the camera stops and the player walks under the top rows) and the bottom edge (where the lesson can move onto the player).
 * Checks: no HUD row covers another (the menu included), no text is cut by its own box, nothing leaves the screen, and whatever lies over
 * the player's square (a HUD row, a place label) is faded by `is-over-player` (clearOfPlayer.ts). Labels under the buttons are world text
 * and are not counted here. `DEVICES=…` names the profiles (default: four phones and a landscape one); `BASE_URL` the dev server. */
import { chromium } from 'playwright';
import { DEVICES, applyDevice } from './lib/devices.mjs';

const base = process.env.BASE_URL || process.env.UI_LAYOUT_URL || 'http://127.0.0.1:5199';
const names = (process.env.DEVICES || 'iphone-se,poco-installata,galaxy-s25,iphone-16,poco-orizzontale-sx').split(',');
const devices = names.map(id => DEVICES.find(d => d.id === id)).filter(Boolean);
const scales = (process.env.SCALES || '1,1.3').split(',').map(Number);
const places = [['antenna', 15, 13, 'centro'], ['antenna', 15, 1, 'bordo alto'], ['antenna', 15, 24, 'bordo basso']];

/** Runs in the page: the HUD rows, the place labels and the player's square, all in CSS pixels. */
const measure = () => {
  const box = el => { const b = el.getBoundingClientRect(); return { l: b.left, t: b.top, r: b.right, b: b.bottom }; };
  const canvas = document.querySelector('canvas'), c = canvas.getBoundingClientRect();
  const p = JSON.parse(canvas.dataset.worldPlayerBounds);
  const player = { l: c.left + p.x / 240 * c.width, t: c.top + p.y / p.viewHeight * c.height, r: c.left + (p.x + p.w) / 240 * c.width, b: c.top + (p.y + p.h) / p.viewHeight * c.height };
  const rows = [...document.querySelectorAll('.ui-world-hud :is(.ui-world-top > *, .ui-world-objective, .ui-world-status > *, .ui-world-lesson)')]
    .filter(e => e.getClientRects().length && getComputedStyle(e).visibility !== 'hidden' && parseFloat(getComputedStyle(e).opacity) > 0.2)
    .map(e => ({ name: e.matches('.ui-world-nav') ? 'menu' : (e.className.split(' ')[0] || e.tagName).replace('ui-world-', '') + (e.textContent ? ` "${e.textContent.trim().slice(0, 22)}"` : ''), box: box(e), faded: e.classList.contains('is-over-player'), cut: e.scrollHeight > e.clientHeight + 1 || e.scrollWidth > e.clientWidth + 1 }));
  const menu = document.querySelector('.ui-world-nav');
  if (menu && !rows.some(r => r.name === 'menu')) rows.push({ name: 'menu', box: box(menu), faded: false, cut: false });
  const labels = [...document.querySelectorAll('.ui-world-labels > span:not([hidden])')].map(e => ({ name: `label "${e.textContent.trim().slice(0, 22)}"`, box: box(e), faded: e.classList.contains('is-over-player') }));
  return { viewport: [innerWidth, innerHeight], player, rows, labels };
};

const overlap = (a, b) => Math.max(0, Math.min(a.r, b.r) - Math.max(a.l, b.l)) * Math.max(0, Math.min(a.b, b.b) - Math.max(a.t, b.t));
const judge = (m, width, height) => {
  const issues = [];
  const shown = m.rows.filter(r => r.box.r - r.box.l > 1 && r.box.b - r.box.t > 1);
  for (let i = 0; i < shown.length; i++) {
    const a = shown[i];
    if (a.box.l < -1 || a.box.t < -1 || a.box.r > width + 1 || a.box.b > height + 1) issues.push(`off the screen: ${a.name}`);
    if (a.cut) issues.push(`text cut inside its box: ${a.name}`);
    if (overlap(a.box, m.player) > 1 && !a.faded) issues.push(`covers the player (not faded): ${a.name}`);
    for (let j = i + 1; j < shown.length; j++) if (overlap(a.box, shown[j].box) > 1) issues.push(`rows overlap: ${a.name} / ${shown[j].name}`);
  }
  for (const l of m.labels) if (overlap(l.box, m.player) > 1 && !l.faded) issues.push(`covers the player (not faded): ${l.name}`);
  return issues;
};

const browser = await chromium.launch();
const results = [];
try {
  for (const device of devices) for (const scale of scales) for (const [map, x, y, where] of places) {
    const context = await browser.newContext({ viewport: { width: device.w, height: device.h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage(), errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await applyDevice(context, page, device);
    if (scale !== 1) await context.addInitScript(s => {
      const px = value => value.replace(/(\d+(?:\.\d+)?)px/g, (_, n) => `${+(n * s).toFixed(2)}px`);
      const done = new WeakSet(); const walk = rules => { for (const rule of rules) { if (rule.cssRules) walk(rule.cssRules); const st = rule.style; if (!st || done.has(rule)) continue; done.add(rule); const fs = st.getPropertyValue('font-size'); if (fs?.includes('px')) st.setProperty('font-size', px(fs), st.getPropertyPriority('font-size')); } };
      const apply = () => { for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } } };
      new MutationObserver(apply).observe(document, { childList: true, subtree: true }); setInterval(apply, 150);
    }, scale);
    const label = `${device.id} · text ${scale} · ${where}`;
    try {
      await page.goto(`${base}/scripts/m2-ui-review.html?screen=esplorazione&map=${map}&x=${x}&y=${y}`);
      await page.waitForFunction(() => document.querySelector('canvas')?.dataset.worldReady === 'true', null, { timeout: 20000 });
      // The notice and the place name come and go in the first seconds; the frame is judged twice, once in each state.
      const issues = [];
      for (const wait of [400, 2600]) {
        await page.waitForTimeout(wait);
        const m = await page.evaluate(measure);
        issues.push(...judge(m, device.w, device.h).map(i => `${i} (${wait < 1000 ? 'early' : 'later'})`));
      }
      issues.push(...errors.map(e => `page error: ${e}`));
      results.push({ label, issues });
      if (issues.length) await page.screenshot({ path: `artifacts/hud-clear/${device.id}-${scale}-${where.replace(' ', '-')}.png` });
    } catch (e) {
      results.push({ label, issues: [e.message.split('\n')[0]] });
    }
    await context.close();
  }
} finally {
  await browser.close();
}
const bad = results.filter(r => r.issues.length);
for (const r of results) console.log(`${r.issues.length ? 'FAIL' : 'ok  '} ${r.label}${r.issues.length ? `\n     ${r.issues.join('\n     ')}` : ''}`);
console.log(`\n${results.length - bad.length}/${results.length} placements clear`);
if (bad.length) process.exitCode = 1;
