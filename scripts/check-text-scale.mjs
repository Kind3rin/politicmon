/** Android scales web text with the system font size (Settings → Display → Font size; "Large" is about 1.3×) and the viewport stays as it is.
 * Every size in every style sheet is multiplied by `SCALE` (default 1.3) before the screen is built, then the device audit of `check-pwa-device` runs.
 * `DEVICES=…`, `SCREENS=…` as there; by default the POCO installed, edge to edge and on its side, plus a large Android and an iPhone. Narrow phones (360 px) with the largest font still crowd the battle plates and the map: see docs/MOBILE-PWA-LAYOUT.md. */
process.env.TEXT_SCALE = process.env.SCALE || '1.3';
process.env.DEVICES ||= 'poco-installata,poco-bordo-a-bordo,poco-orizzontale-sx,galaxy-s25-ultra,iphone-16';
await import('./check-pwa-device.mjs');
