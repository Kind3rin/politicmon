/** The player's phone (POCO F9 ULTRA, PWA installed): every screen on every profile of `lib/devices.mjs`, with the real safe-area insets.
 * Everything a finger or an eye needs must sit inside the safe rectangle (window minus punch-hole and gesture bar); targets are at least 44 px;
 * lists must scroll far enough to clear the gesture bar; a rotation in the middle of a game must not leave anything outside.
 * Runs against the review page. `BASE_URL` (default the dev server); `DEVICES=all` runs every profile, `DEVICES=poco-installata,...` the named ones (default: the POCO in all its ways and one of each other kind of phone); `SCREENS=menu,borsa` the screens. */
import { chromium } from 'playwright';
import fs from 'node:fs/promises';
import { DEVICES, applyDevice, defaultDevices } from './lib/devices.mjs';

const base = process.env.BASE_URL || process.env.UI_LAYOUT_URL || 'http://127.0.0.1:5199';
const runtimeScreens = ['esplorazione', 'lotta', 'lotta-finale', 'lotta-esaurita', 'dialogo', 'dialogo-scelte', 'menu'];
const panelScreens = ['squadra', 'compagno', 'borsa', 'impara', 'mappa', 'pianta', 'negozio', 'dex', 'circolo', 'missioni', 'evoluzione', 'titolo', 'starter', 'archivio', 'governo', 'tipi', 'morale', 'fonti', 'backup', 'traguardi', 'audio', 'carburante', 'viaggio', 'poteri', 'volo', 'lotta-crescita', 'tessera', 'squadra-riordina'];
const only = list => (process.env[list] ? process.env[list].split(',') : null);
const devices = process.env.DEVICES === 'all' ? DEVICES : only('DEVICES') ? DEVICES.filter(d => only('DEVICES').includes(d.id)) : defaultDevices();
// `name` → harness address. The variants show what the plain screens hide: the clock chip, the coach card, the other map pages.
const variants = { 'esplorazione-orologio': 'esplorazione&palinsesto', 'esplorazione-lezione': 'esplorazione&palinsesto&lesson', 'mappa-rotte': 'mappa&tab=rotte', 'mappa-atto3': 'mappa&tab=atto3' };
const screens = [...runtimeScreens, ...panelScreens, ...Object.keys(variants)].filter(s => !only('SCREENS') || only('SCREENS').includes(s));
const kind = screen => screen.startsWith('esplorazione') ? 'esplorazione' : screen.startsWith('mappa') ? 'mappa' : screen;
const waitFor = screen0 => { const screen = kind(screen0); return waitSelector(screen); };
const waitSelector = screen => screen === 'menu' ? '.ui-pause' : screen === 'dialogo' ? '#game-dialog' : screen === 'dialogo-scelte' ? '.ui-conversation' : screen.startsWith('lotta') && screen !== 'lotta-crescita' ? '.ui-arena-secondary button:has-text("Cambio")' : screen === 'esplorazione' ? '#world-ui' : '#game-ui:not([hidden]) h1';

/** Runs in the page. Returns the list of problems. */
const audit = ({ screen, insets, short }) => {
  const issues = [], w = innerWidth, h = innerHeight;
  const safe = { left: insets.left, right: w - insets.right, top: insets.top, bottom: h - insets.bottom };
  const visible = e => e.checkVisibility({ checkVisibilityCSS: true, checkOpacity: true });
  const box = e => e.getBoundingClientRect();
  const name = e => e.getAttribute('aria-label') || e.textContent.trim().slice(0, 40) || e.className;
  const root = document.querySelector('#console-shell');
  const all = [...root.querySelectorAll('*')].filter(visible);
  const scrollParent = e => { for (let p = e.parentElement; p && p !== root; p = p.parentElement) { const s = getComputedStyle(p); if (/auto|scroll/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) return p; } return null; };
  const controls = all.filter(e => e.matches('button,a,input,select'));
  for (const e of controls) {
    const r = box(e), holder = scrollParent(e);
    if (r.width < 43.5 || r.height < 43.5) issues.push(`small target ${Math.round(r.width)}×${Math.round(r.height)}: ${name(e)}`);
    if (r.left < safe.left - .5 || r.right > safe.right + .5) issues.push(`outside the safe width: ${name(e)} (${Math.round(r.left)}..${Math.round(r.right)} of ${safe.left}..${safe.right})`);
    if (!holder && (r.top < safe.top - .5 || r.bottom > safe.bottom + .5)) issues.push(`outside the safe height: ${name(e)} (${Math.round(r.top)}..${Math.round(r.bottom)} of ${safe.top}..${safe.bottom})`);
  }
  // Words that run past the edge of their own button.
  for (const e of controls) {
    const r = box(e), walker = document.createTreeWalker(e, NodeFilter.SHOW_TEXT);
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.textContent.trim() || !n.parentElement.checkVisibility({ checkVisibilityCSS: true })) continue;
      const range = document.createRange(); range.selectNodeContents(n);
      const t = range.getBoundingClientRect();
      const cut = getComputedStyle(e); // a line that ends in an ellipsis is cut on purpose
      if (cut.textOverflow === 'ellipsis' && cut.overflow !== 'visible') break;
      if (t.width && (t.left < r.left - .5 || t.right > r.right + .5)) { issues.push(`text runs past its button: "${n.textContent.trim().slice(0, 30)}" in ${name(e)} (${Math.round(t.left)}..${Math.round(t.right)} of ${Math.round(r.left)}..${Math.round(r.right)})`); break; }
    }
  }
  // Text a person has to read, outside scrolling lists. Backgrounds and the art run to the edge on purpose.
  const texts = all.filter(e => [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()) && !e.closest('canvas,.ui-world-labels') && !scrollParent(e) && !e.matches('button *,button'));
  for (const e of texts) {
    const r = box(e); if (r.width < 1 || r.height < 1) continue;
    if (r.left < safe.left - 4 || r.right > safe.right + 4 || r.top < safe.top - 4 || r.bottom > safe.bottom + 4) issues.push(`text outside the safe area: "${name(e)}" (${Math.round(r.left)},${Math.round(r.top)}..${Math.round(r.right)},${Math.round(r.bottom)})`);
  }
  // Lists must scroll far enough to clear the gesture bar.
  const lists = [...new Set(controls.map(scrollParent).filter(Boolean))];
  for (const list of lists) {
    list.scrollTop = list.scrollHeight;
    const last = [...list.querySelectorAll('button,a,input,select')].filter(visible).map(e => box(e).bottom).sort((a, b) => b - a)[0];
    if (last && last > safe.bottom + .5) issues.push(`list ends under the gesture bar: ${list.className} (${Math.round(last)} > ${safe.bottom})`);
    if (box(list).bottom > h + .5 || box(list).right > w + .5) issues.push(`list leaves the screen: ${list.className}`);
    list.scrollTop = 0;
  }
  // Two controls never overlap.
  const overlap = (a, b) => Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 && Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1;
  // Two buttons that share more than a corner (a fifth of the smaller one) are in each other's way.
  const shared = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) / Math.min(a.width * a.height, b.width * b.height);
  for (let i = 0; i < controls.length; i++) for (let j = i + 1; j < controls.length; j++) if (!scrollParent(controls[i]) && !scrollParent(controls[j]) && shared(box(controls[i]), box(controls[j])) > .2) issues.push(`overlap: ${name(controls[i])} / ${name(controls[j])}`);
  if (document.documentElement.scrollWidth > w + 1 || document.documentElement.scrollHeight > h + 1) issues.push('the page itself scrolls');
  const canvas = document.querySelector('canvas'), c = box(canvas);
  const painted = key => { const b = JSON.parse(canvas.dataset[key]); return { left: c.left + b.x / 240 * c.width, top: c.top + b.y / b.viewHeight * c.height, right: c.left + (b.x + b.w) / 240 * c.width, bottom: c.top + (b.y + b.h) / b.viewHeight * c.height }; };
  if (screen === 'esplorazione') {
    if (c.width * c.height / (w * h) < .95) issues.push('the world is smaller than the window');
    const player = painted('worldPlayerBounds');
    if (player.left < safe.left || player.right > safe.right || player.top < safe.top || player.bottom > safe.bottom) issues.push('the player is under a cutout or the gesture bar');
    // In a window this short the free band between the buttons and the stick is the player's: the coach card, which has a close button, may pass over it.
    for (const e of [...controls, ...document.querySelectorAll('.ui-world-hud > *')].filter(x => visible(x) && !(short && x.closest('.ui-world-lesson')))) if (overlap(box(e), player)) issues.push(`interface covers the player: ${name(e)}`);
  } else if (screen.startsWith('lotta') && screen !== 'lotta-crescita') {
    for (const key of ['foeBounds', 'playerBounds']) {
      const s = painted(key);
      // The art may bleed under a cutout; its middle may not.
      const mx = (s.left + s.right) / 2, my = (s.top + s.bottom) / 2;
      if (mx < safe.left || mx > safe.right || my < safe.top || my > safe.bottom) issues.push(`${key} centred under a cutout`);
      for (const e of [...controls, ...all.filter(x => x.matches('.ui-combatant,.ui-intent'))]) if (overlap(box(e), s)) issues.push(`${name(e)} covers ${key}`);
    }
    for (const e of all.filter(x => x.matches('.ui-combatant'))) { const r = box(e); if (r.left < safe.left - .5 || r.right > safe.right + .5 || r.top < safe.top - .5) issues.push(`name plate outside the safe area: ${name(e)}`); }
  } else if (screen.startsWith('dialogo')) {
    const dialog = document.querySelector('.ui-dialog:not([hidden])'), r = box(dialog);
    if (r.left < safe.left - .5 || r.right > safe.right + .5 || r.bottom > safe.bottom + .5) issues.push('dialog outside the safe area');
  }
  return issues;
};

const browser = await chromium.launch(), failures = [], summary = [];
await fs.mkdir('artifacts/device', { recursive: true });
try {
  const runDevice = async device => {
    let bad = 0;
    const found = [];
    for (const screen of screens) {
      const context = await browser.newContext({ viewport: { width: device.w, height: device.h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
      const page = await context.newPage(), errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await applyDevice(context, page, device);
      if (process.env.TEXT_SCALE) await context.addInitScript(scale => {
        const px = value => value.replace(/(\d+(?:\.\d+)?)px/g, (_, n) => `${+(n * scale).toFixed(2)}px`);
        const done = new WeakSet(); const walk = rules => { for (const rule of rules) { if (rule.cssRules) walk(rule.cssRules); const s = rule.style; if (!s || done.has(rule)) continue; done.add(rule); for (const prop of ['font-size']) if (s.getPropertyValue(prop)?.includes('px')) s.setProperty(prop, px(s.getPropertyValue(prop)), s.getPropertyPriority(prop)); } };
        const apply = () => { for (const sheet of document.styleSheets) { try { walk(sheet.cssRules); } catch { /* cross-origin */ } } };
        new MutationObserver(apply).observe(document, { childList: true, subtree: true }); setInterval(apply, 150);
      }, Number(process.env.TEXT_SCALE));
      try {
        await page.goto(`${base}/scripts/m2-ui-review.html?screen=${variants[screen] ?? screen}`);
        await page.locator(waitFor(screen)).first().waitFor({ timeout: 15000 });
        await page.evaluate(() => document.fonts.ready);
        if (kind(screen) === 'esplorazione') await page.waitForFunction(() => document.querySelector('canvas')?.dataset.worldReady === 'true', null, { timeout: 15000 });
        else if (screen.startsWith('lotta') && screen !== 'lotta-crescita') await page.waitForFunction(() => document.querySelector('canvas')?.dataset.foeBounds, null, { timeout: 15000 });
        if (screen === 'dialogo') await page.getByRole('button', { name: 'Continua', exact: true }).waitFor();
        await page.waitForTimeout(300);
        const issues = [...errors.map(e => `page error: ${e}`), ...await page.evaluate(audit, { screen: kind(screen), insets: device.insets, short: device.short })];
        if (issues.length) { bad++; found.push(...issues.map(i => `${device.id} · ${screen}: ${i}`)); await page.screenshot({ path: `artifacts/device/${device.id}-${screen}.png` }); }
      } catch (e) { bad++; found.push(`${device.id} · ${screen}: ${e.message.split('\n')[0]}`); }
      await context.close();
    }
    return { line: `${bad ? 'FAIL' : 'ok  '} ${device.id.padEnd(22)} ${device.w}×${device.h}  inset ${Object.values(device.insets).join('/')}  ${screens.length - bad}/${screens.length} schermate`, found };
  };
  // A few profiles at a time: the whole matrix has to fit the runner's five minutes.
  const results = [], queue = [...devices];
  await Promise.all(Array.from({ length: 6 }, async () => { for (let d = queue.shift(); d; d = queue.shift()) results[devices.indexOf(d)] = await runDevice(d); }));
  for (const r of results) { summary.push(r.line); failures.push(...r.found); }
  // A rotation in the middle of a game: the same page, resized, must still fit.
  for (const [from, to] of [['poco-bordo-a-bordo', 'poco-orizzontale-sx'], ['poco-orizzontale-dx', 'poco-installata'], ['poco-tre-tasti', 'poco-orizzontale-tre-tasti']]) {
    const a = DEVICES.find(d => d.id === from), b = DEVICES.find(d => d.id === to);
    const context = await browser.newContext({ viewport: { width: a.w, height: a.h }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    await applyDevice(context, page, a);
    await page.goto(`${base}/scripts/m2-ui-review.html?screen=esplorazione`);
    await page.waitForFunction(() => document.querySelector('canvas')?.dataset.worldReady === 'true', null, { timeout: 15000 });
    await page.setViewportSize({ width: b.w, height: b.h });
    if (context.__fakeCdp) await page.evaluate(i => { for (const [side, value] of Object.entries(i)) document.documentElement.style.setProperty(`--sai-${side}`, value + 'px'); }, b.insets);
    else { const cdp = await context.newCDPSession(page); await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: b.insets }); }
    await page.waitForTimeout(700);
    const issues = await page.evaluate(audit, { screen: 'esplorazione', insets: b.insets });
    summary.push(`${issues.length ? 'FAIL' : 'ok  '} rotazione ${from} → ${to}`);
    failures.push(...issues.map(i => `rotazione ${from} → ${to}: ${i}`));
    await context.close();
  }
} finally { await browser.close(); }

// What an installed PWA needs besides the layout.
const manifest = JSON.parse(await fs.readFile('public/manifest.webmanifest', 'utf8')), html = await fs.readFile('index.html', 'utf8');
const pwa = [];
if (manifest.display !== 'standalone') pwa.push('manifest: display is not standalone');
if (!manifest.icons.some(i => i.purpose === 'maskable' && i.sizes === '512x512')) pwa.push('manifest: no 512 maskable icon');
if (!manifest.icons.some(i => i.sizes === '192x192')) pwa.push('manifest: no 192 icon');
if (!manifest.id) pwa.push('manifest: no `id` (the installed identity would follow the URL)');
if (!manifest.lang) pwa.push('manifest: no `lang`');
if (!manifest.categories?.length) pwa.push('manifest: no `categories`');
if (!manifest.screenshots?.length) pwa.push('manifest: no `screenshots` (the install sheet stays the plain one)');
for (const s of manifest.screenshots ?? []) { try { await fs.access('public/' + s.src.replace(/^\.\//, '')); } catch { pwa.push(`manifest: missing screenshot ${s.src}`); } }
if (!manifest.screenshots?.some(s => s.form_factor === 'narrow') || !manifest.screenshots?.some(s => s.form_factor === 'wide')) pwa.push('manifest: screenshots need a narrow and a wide form factor');
if (!/viewport-fit=cover/.test(html)) pwa.push('index.html: viewport-fit=cover missing');
if (!/name="theme-color"/.test(html)) pwa.push('index.html: no theme-color');
if (manifest.theme_color !== (html.match(/name="theme-color" content="([^"]+)"/) || [])[1]) pwa.push('manifest theme_color differs from the meta tag');
failures.push(...pwa.map(p => `PWA ${p}`));
summary.push(`${pwa.length ? 'FAIL' : 'ok  '} manifest e meta della PWA`);

console.log(summary.join('\n'));
if (failures.length) { console.log(`\n${failures.length} problemi:\n- ${failures.slice(0, 80).join('\n- ')}${failures.length > 80 ? `\n… e altri ${failures.length - 80}` : ''}`); process.exit(1); }
console.log('\nSpazi e PWA a posto su tutti i profili.');
