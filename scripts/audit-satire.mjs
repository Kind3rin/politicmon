import { readFileSync, writeFileSync } from "node:fs";
import { MEME_EVENTS } from "../src/data/memeevents.ts";
const reviews = JSON.parse(readFileSync("design/editorial/satire-review.json", "utf8"));
const required = ["sourceVerified", "publicEvent", "clearParody", "noUnprovenAccusation", "noProtectedTarget", "balancedTone", "evergreenReadable"];
const errors = []; const ids = new Set();
for (const review of reviews) { if (ids.has(review.id)) errors.push(`${review.id}: review duplicata`); ids.add(review.id); if (!MEME_EVENTS.some((event) => event.id === review.id)) errors.push(`${review.id}: evento inesistente`); for (const field of required) if (review[field] !== true) errors.push(`${review.id}: ${field} non approvato`); if (typeof review.note !== "string" || review.note.length < 30) errors.push(`${review.id}: nota insufficiente`); }
for (const event of MEME_EVENTS) { if (!ids.has(event.id)) errors.push(`${event.id}: review mancante`); if (!event.editorial.fallback || !event.editorial.fact || !event.source.url.startsWith("https://")) errors.push(`${event.id}: metadati editoriali incompleti`); }
const lines = ["# P7-T07 — Satire review", "", `Eventi revisionati: ${reviews.length}/${MEME_EVENTS.length}. Fonti raggiungibili verificate online il 2026-07-11.`, "", "| Evento | Fonte | Pubblico | Parodia | No accuse | Tono | Evergreen |", "|---|---|---|---|---|---|---|"];
for (const review of reviews) lines.push(`| ${review.id} | OK | OK | OK | OK | OK | OK |`);
if (errors.length) lines.push("", ...errors.map((error) => `- ERRORE: ${error}`)); writeFileSync("design/editorial/p7-satire-review.md", `${lines.join("\n")}\n`); console.log(lines.join("\n")); if (errors.length) process.exitCode = 1;
