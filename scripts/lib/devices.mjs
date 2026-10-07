/** Phone profiles for the layout checks. The POCO F9 ULTRA is the player's phone, installed as a PWA: the profiles cover its portrait and landscape
 * windows, the punch-hole and the gesture bar as safe-area insets, a browser tab with the toolbar showing, a smaller display scale and a split window.
 * Sizes are CSS pixels. `insets` are what `env(safe-area-inset-*)` returns. */
export const DEVICES = [
  { id: 'poco-installata', w: 412, h: 915, dpr: 3.5, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'PWA installata, barre di sistema fuori dalla finestra' },
  { id: 'poco-bordo-a-bordo', w: 412, h: 915, dpr: 3.5, insets: { top: 36, bottom: 24, left: 0, right: 0 }, note: 'foro della fotocamera e barra dei gesti dentro la finestra' },
  { id: 'poco-zoom-ridotto', w: 393, h: 873, dpr: 3.66, insets: { top: 36, bottom: 24, left: 0, right: 0 }, note: 'dimensione del display più grande' },
  { id: 'poco-zoom-largo', w: 450, h: 1000, dpr: 3.2, insets: { top: 36, bottom: 24, left: 0, right: 0 }, note: 'dimensione del display più piccola' },
  { id: 'poco-browser', w: 412, h: 775, dpr: 3.5, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'scheda di Chrome con la barra degli indirizzi visibile' },
  { id: 'poco-orizzontale-sx', w: 915, h: 412, dpr: 3.5, insets: { top: 0, bottom: 24, left: 48, right: 0 }, note: 'orizzontale, foro a sinistra, barra dei gesti' },
  { id: 'poco-orizzontale-dx', w: 915, h: 412, dpr: 3.5, insets: { top: 0, bottom: 24, left: 0, right: 48 }, note: 'orizzontale, foro a destra, barra dei gesti' },
  { id: 'poco-finestra-divisa', w: 412, h: 450, dpr: 3.5, insets: { top: 0, bottom: 0, left: 0, right: 0 }, note: 'schermo diviso o finestra mobile', short: true }
];

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
