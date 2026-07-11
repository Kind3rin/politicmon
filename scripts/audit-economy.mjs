import { mkdirSync, writeFileSync } from "node:fs";
import { economyChecks } from "../src/game/economyAudit.ts";
const checks = economyChecks();
const lines = ["# P7-T02 — Audit economia", "", "| Invariante | Esito | Evidenza |", "|---|---|---|"];
for (const check of checks) lines.push(`| ${check.id} | ${check.ok ? "OK" : "ERRORE"} | ${check.detail} |`);
lines.push("", "Le rivincite richiedono passi e battaglia; la sconfitta cura la squadra e limita la perdita a 600€, quindi non esiste soft-lock economico.");
mkdirSync("design/balance", { recursive: true }); writeFileSync("design/balance/p7-economy-audit.md", `${lines.join("\n")}\n`); console.log(lines.join("\n"));
if (checks.some((check) => !check.ok)) process.exitCode = 1;
