/** Phone profiles for the layout checks. The POCO F9 ULTRA is the player's phone, installed as a PWA.
 * Real figures: 6.9" AMOLED, 2608×1200 px, 416 ppi, 19.5:9 → a CSS viewport of 400×869 at a device pixel ratio of 3
 * (po.co spec sheet, whatismyscreensize.com). Sizes are CSS pixels; `insets` are what `env(safe-area-inset-*)` returns.
 * Heights follow the Android window rules: an installed PWA loses the status bar (≈34), a Chrome tab also the toolbar (≈54),
 * the top half of a split screen is about half of what is left. The insets are plausible, not measured: a central punch-hole
 * and status bar ≈36, gesture bar ≈20, three-button bar 48 (at the side when the phone is held sideways). */
export const DEVICES = [
  // ---- POCO F9 ULTRA and its ways of being held ----
  { id: 'poco-installata', w: 400, h: 835, dpr: 3, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'PWA installata, barre di sistema fuori dalla finestra' },
  { id: 'poco-bordo-a-bordo', w: 400, h: 869, dpr: 3, insets: { top: 36, bottom: 20, left: 0, right: 0 }, note: 'schermo intero: foro e barra di stato 36, barra dei gesti 20' },
  { id: 'poco-tre-tasti', w: 400, h: 869, dpr: 3, insets: { top: 36, bottom: 48, left: 0, right: 0 }, note: 'schermo intero con la barra a tre tasti (48)' },
  { id: 'poco-zoom-ridotto', w: 360, h: 782, dpr: 3.33, insets: { top: 36, bottom: 20, left: 0, right: 0 }, note: 'dimensione del display più grande' },
  { id: 'poco-zoom-largo', w: 432, h: 939, dpr: 2.78, insets: { top: 36, bottom: 20, left: 0, right: 0 }, note: 'dimensione del display più piccola' },
  { id: 'poco-browser', w: 400, h: 781, dpr: 3, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'scheda di Chrome con la barra degli indirizzi' },
  { id: 'poco-orizzontale-sx', w: 869, h: 400, dpr: 3, insets: { top: 0, bottom: 20, left: 36, right: 0 }, note: 'orizzontale, foro a sinistra, barra dei gesti' },
  { id: 'poco-orizzontale-dx', w: 869, h: 400, dpr: 3, insets: { top: 0, bottom: 20, left: 0, right: 36 }, note: 'orizzontale, foro a destra, barra dei gesti' },
  { id: 'poco-orizzontale-tre-tasti', w: 869, h: 400, dpr: 3, insets: { top: 0, bottom: 0, left: 36, right: 48 }, note: 'orizzontale, foro a sinistra, barra a tre tasti a destra' },
  { id: 'poco-finestra-divisa', w: 400, h: 405, dpr: 3, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'metà alta dello schermo diviso', short: true },
  // ---- Other phones: nothing in the game is written for one device, so the usual ones are tried too ----
  // (CSS viewports: yesviz.com, useyourloaf.com, kobiton.com; iPhone insets are Apple's: Dynamic Island 59-62 up, 34 home bar, 59-62 at the sides in landscape)
  { id: 'android-piccolo', w: 360, h: 640, dpr: 3, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'Android economico 360×640', core: true },
  { id: 'galaxy-s25', w: 360, h: 780, dpr: 3, insets: { top: 32, bottom: 24, left: 0, right: 0 }, note: 'Galaxy S25 360×780', core: true },
  { id: 'galaxy-s25-ultra', w: 412, h: 891, dpr: 3.5, insets: { top: 32, bottom: 24, left: 0, right: 0 }, note: 'Galaxy S25 Ultra / Pixel 8 412×891' },
  { id: 'pixel-9', w: 360, h: 808, dpr: 3, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'Pixel 9 360×808' },
  { id: 'pixel-9-pro-xl', w: 448, h: 997, dpr: 2.8, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'Pixel 9 Pro XL 448×997' },
  { id: 'iphone-se', w: 375, h: 667, dpr: 2, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'iPhone SE 375×667, senza isola', core: true },
  { id: 'iphone-16', w: 393, h: 852, dpr: 3, insets: { top: 59, bottom: 34, left: 0, right: 0 }, note: 'iPhone 16 393×852, isola 59, barra 34', core: true },
  { id: 'iphone-16-pro', w: 402, h: 874, dpr: 3, insets: { top: 62, bottom: 34, left: 0, right: 0 }, note: 'iPhone 16 Pro 402×874' },
  { id: 'iphone-16-pro-max', w: 440, h: 956, dpr: 3, insets: { top: 62, bottom: 34, left: 0, right: 0 }, note: 'iPhone 16 Pro Max 440×956' },
  { id: 'iphone-16-orizzontale', w: 852, h: 393, dpr: 3, insets: { top: 0, bottom: 21, left: 59, right: 59 }, note: 'iPhone 16 di lato, isola a sinistra, bordi 59', core: true },
  { id: 'iphone-se-orizzontale', w: 667, h: 375, dpr: 2, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'iPhone SE di lato 667×375' },
  { id: 'tablet-verticale', w: 744, h: 1133, dpr: 2, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'iPad mini / tablet piccolo 744×1133', core: true },
  { id: 'tablet-orizzontale', w: 1133, h: 744, dpr: 2, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'tablet piccolo di lato 1133×744' }
];

/** The default run: the POCO in all its ways plus one of each other kind of phone; `DEVICES=all` runs everything, `DEVICES=a,b` the named ones. */
export const defaultDevices = () => DEVICES.filter(d => d.id.startsWith('poco-') || d.core);

/** Make `page` behave like `device`: safe-area insets and the installed display mode. Chromium has real overrides through the DevTools protocol;
 * for other engines every `env(safe-area-inset-*)` in the served styles is rewritten to a custom property set from the profile. */
export async function applyDevice(context, page, device, { standalone = true } = {}) {
  const { top, bottom, left, right } = device.insets;
  let cdp = null;
  try { cdp = await context.newCDPSession(page); } catch { /* not Chromium */ }
  if (cdp && !context.__fakeCdp) {
    await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top, bottom, left, right } });
    if (standalone) await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'display-mode', value: 'standalone' }] });
    return 'cdp';
  }
  await context.addInitScript(i => {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(`:root{--sai-top:${i.top}px;--sai-bottom:${i.bottom}px;--sai-left:${i.left}px;--sai-right:${i.right}px}`);
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, sheet];
  }, { top, bottom, left, right });
  await page.route('**/*', async route => {
    const url = route.request().url();
    if (!/\.(css|js|ts|html)(\?|$)|\/$|\?import|\.mjs/.test(url)) return route.continue();
    try {
      const response = await route.fetch();
      const body = await response.text();
      await route.fulfill({ response, body: body.replace(/env\(\s*safe-area-inset-(top|bottom|left|right)\s*(?:,[^)]*)?\)/g, 'var(--sai-$1,0px)') });
    } catch { await route.continue(); }
  });
  return 'rewrite';
}
