/** Preload that makes every `chromium.launch()` in the checks start WebKit instead, so the current suite can be run with Safari's engine:
 *   NODE_ARGS="--import ./scripts/lib/webkit-patch.mjs" BASE_URL=http://127.0.0.1:5199 node scripts/run-checks.mjs --only first-minutes,items
 * WebKit has no DevTools protocol: `newCDPSession` is replaced by a stand-in that only understands `Input.dispatchTouchEvent`. CPU throttling and other CDP commands are ignored, so `perf:check` is not meaningful this way. */
import { chromium, webkit } from 'playwright';
chromium.launch = async (options = {}) => {
  const { executablePath, channel, ...rest } = options;
  const browser = await webkit.launch(rest), newContext = browser.newContext.bind(browser);
  browser.newContext = async o => withTouch(await newContext(o));
  return browser;
};

/** WebKit has no DevTools protocol. The checks only use it to send touches (`Input.dispatchTouchEvent`), so stand in for that one command:
 * the touches become pointer events of type "touch" fired on the element under the finger (the game listens to pointer events, not touch events). */
const touchSession = page => {
  return {
    async send(method, params) {
      if (method !== 'Input.dispatchTouchEvent') return {};
      await page.evaluate(({ type, touchPoints }) => {
        const w = window;
        w.__touch ??= new Map();
        const kind = { touchStart: 'pointerdown', touchMove: 'pointermove', touchEnd: 'pointerup', touchCancel: 'pointercancel' }[type];
        const ids = new Set(touchPoints.map(p => p.id ?? 0));
        const fire = (target, name, id, x, y) => target.dispatchEvent(new PointerEvent(name, {
          bubbles: true, cancelable: true, composed: true, pointerId: id + 1, pointerType: 'touch', isPrimary: id === 0,
          clientX: x, clientY: y, button: name === 'pointermove' ? -1 : 0, buttons: name === 'pointerup' ? 0 : 1, width: 1, height: 1, pressure: name === 'pointerup' ? 0 : 0.5
        }));
        if (type === 'touchEnd' || type === 'touchCancel') {
          for (const [id, t] of [...w.__touch]) if (!touchPoints.length || !ids.has(id) || true) { fire(t.target, kind, id, t.x, t.y); w.__touch.delete(id); }
          return;
        }
        for (const p of touchPoints) {
          const id = p.id ?? 0, held = w.__touch.get(id);
          const target = held ? held.target : (document.elementFromPoint(p.x, p.y) ?? document.body);
          w.__touch.set(id, { target, x: p.x, y: p.y });
          fire(target, kind, id, p.x, p.y);
        }
      }, params);
      return {};
    },
    async detach() {}
  };
};
const withTouch = context => { context.newCDPSession = async page => touchSession(page); return context; };
