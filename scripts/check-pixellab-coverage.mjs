import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const manifestPath = join(root, "scripts", "pixellab-reboot-assets.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const strict = process.argv.includes("--strict");

function walk(dir, filter = () => true) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walk(path, filter));
    } else if (filter(path)) {
      out.push(path);
    }
  }
  return out;
}

function assetOutputs() {
  const outputs = [];
  for (const asset of manifest.assets ?? []) {
    for (const output of asset.output ?? []) {
      outputs.push({ id: asset.id, domain: asset.domain, output });
    }
  }
  for (const delegated of manifest.delegatedManifests ?? []) {
    const full = join(root, delegated.path);
    if (!existsSync(full)) {
      continue;
    }
    const data = JSON.parse(readFileSync(full, "utf8"));
    for (const mon of data.monsters ?? []) {
      outputs.push({
        id: mon.id,
        domain: delegated.domain,
        output: delegated.outputTemplate.replace("{id}", mon.id)
      });
    }
  }
  return outputs;
}

const required = assetOutputs();
const missing = required.filter((asset) => !existsSync(join(root, "public", "sprites", asset.output)));
const present = required.length - missing.length;

console.log(`PixelLab coverage: ${present}/${required.length} required files present.`);
if (missing.length > 0) {
  console.log("\nMissing assets:");
  for (const asset of missing) {
    console.log(`- [${asset.domain}] ${asset.id}: public/sprites/${asset.output}`);
  }
}

const srcFiles = walk(join(root, "src"), (path) => path.endsWith(".ts"));
console.log("\nFallback/debt scan:");
for (const debt of manifest.codeDebtPatterns ?? []) {
  let count = 0;
  const samples = [];
  for (const file of srcFiles) {
    const text = readFileSync(file, "utf8");
    const lines = text.split(/\r?\n/);
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].includes(debt.pattern)) {
        count += 1;
        if (samples.length < 8) {
          samples.push(`${file.replace(root + "\\", "")}:${i + 1}`);
        }
      }
    }
  }
  console.log(`- ${debt.id}: ${count}`);
  for (const sample of samples) {
    console.log(`  ${sample}`);
  }
}

if (strict && missing.length > 0) {
  process.exitCode = 1;
}
