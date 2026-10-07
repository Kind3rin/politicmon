/** The back gesture of an installed Android PWA must not close the game by accident: on the map it opens the menu, over a panel it closes it,
 * and only from the title screen does it leave. Android user agent, display mode standalone (the query is answered, see `lib/devices.mjs`), real game (a new campaign). */
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { forceStandalone } from './lib/devices.mjs';

const base = process.env.BASE_URL || process.env.UI_LAYOUT_URL || 'http://127.0.0.1:5199';
const UA = 'Mozilla/5.0 (Linux; Android 15; 25060PC32G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';
const browser = await chromium.launch();
const open = async ({ android = true } = {}) => {
  const context = await browser.newContext({ viewport: { width: 400, height: 835 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: android ? UA : undefined, serviceWorkers: 'block' });
  const page = await context.newPage(), errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await forceStandalone(context);
  await page.addInitScript(() => { sessionStorage.setItem('politicmon-intro-seen', '1'); localStorage.setItem('politicmon-pwa-dismissed', String(Date.now())); });
  await page.goto(base);
  return { context, page, errors };
};
const back = async page => { await page.evaluate(() => history.back()); await page.waitForTimeout(500); };
try {
  // The map: back opens the menu, back again closes it, the game is still here.
  {
    const { context, page, errors } = await open();
    await page.getByRole('button', { name: /Nuova campagna/ }).tap();
    await page.getByRole('button', { name: /Normale/ }).tap();
    await page.waitForFunction(() => document.body.classList.contains('ui-world-open'), null, { timeout: 15000 });
    await page.waitForTimeout(800);
    const url = page.url();
    await back(page);
    assert.equal(page.url(), url, 'back left the page from the map');
    await page.locator('.ui-pause').waitFor({ timeout: 5000 });
    await back(page);
    await page.waitForFunction(() => !document.querySelector('.ui-pause') || !document.querySelector('.ui-pause').checkVisibility?.(), null, { timeout: 5000 });
    assert.equal(page.url(), url, 'back left the page from the menu');
    assert.ok(await page.evaluate(() => document.body.classList.contains('ui-world-open')), 'the map is back after closing the menu');
    // Over a panel: back closes the panel and nothing else.
    await page.locator('.ui-world-nav button:has-text("Squadra")').tap();
    await page.waitForFunction(() => document.body.classList.contains('ui-panel-open'), null, { timeout: 5000 });
    await back(page);
    await page.waitForFunction(() => !document.body.classList.contains('ui-panel-open'), null, { timeout: 5000 });
    assert.equal(page.url(), url, 'back left the page from a panel');
    for (let i = 0; i < 3; i++) await back(page);
    assert.equal(page.url(), url, 'repeated backs left the page');
    assert.deepEqual(errors, []);
    console.log('ok   mappa: indietro apre il menu, poi lo chiude, il gioco resta');
    await context.close();
  }
  // The title is where it leaves.
  {
    const { context, page } = await open();
    await page.getByRole('button', { name: /Nuova campagna/ }).waitFor();
    await page.evaluate(() => history.back());
    await page.waitForFunction(() => location.href === 'about:blank', null, { timeout: 5000 });
    console.log('ok   titolo: indietro esce');
    await context.close();
  }
  // Not installed, or not Android: the browser keeps its own back.
  {
    const { context, page } = await open({ android: false });
    await page.getByRole('button', { name: /Nuova campagna/ }).waitFor();
    assert.equal(await page.evaluate(() => history.length), 2, 'a guard entry was added outside Android');
    await context.close();
    console.log('ok   fuori da Android la cronologia resta com\'è');
  }
} finally { await browser.close(); }
