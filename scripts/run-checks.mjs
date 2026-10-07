/** Runs the browser checks that belong to the development server, one after the other, and says which ones fail.
 *
 *   npx vite --host 127.0.0.1 --port 5199        (restart it after editing src/ or data: hot reload leaves duplicate modules)
 *   BASE_URL=http://127.0.0.1:5199 node scripts/run-checks.mjs [--only a,b] [--skip c] [--list]
 *
 * `NODE_ARGS` is passed to node before each script (for instance `--import /path/to/chrome-patch.mjs` to use an installed Chrome).
 * Not here: the *-release checks (they play saved campaigns on the published site, in Chromium and WebKit), the live-network ones
 * (check-mp-live, check-prod) and everything in scripts/retired. See docs/CONTROLLI.md. */
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';

const NOT_LOCAL = new Set(['check-mp-live', 'check-prod', 'check-precache-build', 'check-err', 'check-terrace-return', 'check-world-navigation-release']);
const args = process.argv.slice(2), flag = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const only = flag('--only')?.split(','), skip = new Set(flag('--skip')?.split(',') ?? []);
const base = process.env.BASE_URL ?? process.env.UI_LAYOUT_URL ?? 'http://127.0.0.1:5199';
const extra = (process.env.NODE_ARGS ?? '').split(/\s+/).filter(Boolean);
const names = readdirSync('scripts').filter(f => /^check-.*\.mjs$/.test(f)).map(f => f.replace(/\.mjs$/, ''))
  .filter(n => !n.endsWith('-release') && !NOT_LOCAL.has(n) && !skip.has(n.replace(/^check-/, '')) && (!only || only.includes(n.replace(/^check-/, '')))).sort();
if (args.includes('--list')) { console.log(names.join('\n')); process.exit(0); }

const results = [];
for (const name of names) {
  const started = Date.now();
  const code = await new Promise(resolve => {
    const child = spawn('node', [...extra, `scripts/${name}.mjs`], { env: { ...process.env, BASE_URL: base, UI_LAYOUT_URL: base }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', d => { out += d; }); child.stderr.on('data', d => { out += d; });
    const timer = setTimeout(() => { child.kill('SIGKILL'); out += '\nTIMEOUT after 300 s'; }, 300_000);
    child.on('close', status => { clearTimeout(timer); results.push({ name, status, seconds: Math.round((Date.now() - started) / 1000), out }); resolve(status); });
  });
  const last = results.at(-1);
  console.log(`${code === 0 ? 'ok  ' : 'FAIL'} ${name.padEnd(34)} ${String(last.seconds).padStart(4)} s`);
}
const failed = results.filter(r => r.status !== 0);
for (const r of failed) console.log(`\n--- ${r.name}\n${r.out.split('\n').filter(l => l.trim() && !/^\s+at /.test(l)).slice(-12).join('\n')}`);
console.log(`\n${results.length - failed.length}/${results.length} checks green${failed.length ? `; failing: ${failed.map(r => r.name).join(', ')}` : ''}.`);
process.exit(failed.length ? 1 : 0);
