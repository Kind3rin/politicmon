import { readFileSync } from "node:fs";
import { MEME_EVENTS } from "../src/data/memeevents.ts";
import { validateMemePack } from "../src/editorial/memePackValidator.ts";

const inputPath = process.argv.find((arg) => arg.endsWith(".json"));
let pack = MEME_EVENTS;
if (inputPath) {
  try { pack = JSON.parse(readFileSync(inputPath, "utf8")); }
  catch (error) { console.error(`ERRORE PACK ${inputPath}: ${error instanceof Error ? error.message : String(error)}`); process.exit(1); }
}
const report = validateMemePack(pack);
for (const issue of report.errors) console.error(`ERRORE | ${issue.scope} | ${issue.message}`);
for (const issue of report.warnings) console.warn(`AVVISO | ${issue.scope} | ${issue.message}`);
console.log(`PACK EDITORIALE: ${Array.isArray(pack) ? pack.length : 0} eventi, ${report.errors.length} errori, ${report.warnings.length} avvisi.`);
if (report.errors.length > 0) process.exitCode = 1;
