export interface EditorialIssue { readonly severity: "error" | "warning"; readonly scope: string; readonly message: string; }
export interface EditorialReport { readonly errors: EditorialIssue[]; readonly warnings: EditorialIssue[]; }

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const ID = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const CONDITION_KINDS = new Set(["flag", "minBadges", "sondaggi"]);
const EFFECT_KINDS = new Set(["sondaggi", "money", "flag", "item", "territory"]);

function add(target: EditorialIssue[], severity: EditorialIssue["severity"], scope: string, message: string): void {
  target.push({ severity, scope, message });
}

export function validateMemePack(value: unknown, now = new Date()): EditorialReport {
  const errors: EditorialIssue[] = []; const warnings: EditorialIssue[] = [];
  if (!Array.isArray(value)) { add(errors, "error", "pack", "la radice deve essere un array di eventi"); return { errors, warnings }; }
  const ids = new Set<string>();
  value.forEach((raw, index) => {
    const scope = `evento[${index}]`;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) { add(errors, "error", scope, "evento non oggetto"); return; }
    const event = raw as Record<string, unknown>; const id = typeof event.id === "string" ? event.id : ""; const eventScope = id ? `evento ${id}` : scope;
    if (!ID.test(id)) add(errors, "error", eventScope, "id mancante o non snake_case"); else if (ids.has(id)) add(errors, "error", eventScope, "id duplicato"); else ids.add(id);
    if (typeof event.title !== "string" || !event.title.trim()) add(errors, "error", eventScope, "titolo obbligatorio"); else if (event.title.length > 31) add(warnings, "warning", eventScope, `titolo lungo ${event.title.length}/31`);
    if (!Array.isArray(event.lines) || event.lines.length === 0 || event.lines.some((line) => typeof line !== "string" || !line.trim())) add(errors, "error", eventScope, "lines deve contenere testo");
    else if (event.lines.some((line) => (line as string).length > 38)) add(warnings, "warning", eventScope, "una riga supera 38 caratteri e verrà spezzata");
    if (event.active !== undefined) {
      const active = event.active as Record<string, unknown>; const from = typeof active?.from === "string" ? active.from : ""; const until = typeof active?.until === "string" ? active.until : "";
      if (!DATE.test(from) || !DATE.test(until) || Date.parse(from) >= Date.parse(until)) add(errors, "error", eventScope, "finestra active YYYY-MM-DD non valida");
      else if (Date.parse(`${until}T23:59:59Z`) < now.getTime()) add(warnings, "warning", eventScope, `evento scaduto il ${until}`);
    }
    if (!Array.isArray(event.conditions)) add(errors, "error", eventScope, "conditions deve essere un array");
    else for (const condition of event.conditions) { const kind = condition && typeof condition === "object" ? (condition as Record<string, unknown>).kind : undefined; if (typeof kind !== "string" || !CONDITION_KINDS.has(kind)) add(errors, "error", eventScope, `condizione sconosciuta ${String(kind)}`); }
    if (!Array.isArray(event.choices) || event.choices.length !== 2) add(errors, "error", eventScope, "servono esattamente due scelte");
    else event.choices.forEach((choiceRaw, choiceIndex) => {
      const choice = choiceRaw as Record<string, unknown>;
      if (!choice || typeof choice.label !== "string" || !choice.label.trim()) add(errors, "error", eventScope, `scelta ${choiceIndex + 1} senza label`); else if (choice.label.length > 22) add(warnings, "warning", eventScope, `label scelta ${choiceIndex + 1} lunga ${choice.label.length}/22`);
      if (!Array.isArray(choice.lines) || choice.lines.length === 0) add(errors, "error", eventScope, `scelta ${choiceIndex + 1} senza testo`);
      if (!Array.isArray(choice.effects) || choice.effects.length === 0) add(errors, "error", eventScope, `scelta ${choiceIndex + 1} senza conseguenze`);
      else for (const effect of choice.effects) { const kind = effect && typeof effect === "object" ? (effect as Record<string, unknown>).kind : undefined; if (typeof kind !== "string" || !EFFECT_KINDS.has(kind)) add(errors, "error", eventScope, `effetto sconosciuto ${String(kind)}`); }
    });
    const source = event.source as Record<string, unknown> | undefined;
    if (!source || typeof source.label !== "string" || !source.label.trim()) add(errors, "error", eventScope, "source.label obbligatoria");
    if (!source || typeof source.url !== "string" || !source.url.startsWith("https://")) add(errors, "error", eventScope, "source.url HTTPS obbligatoria");
    const editorial = event.editorial as Record<string, unknown> | undefined;
    if (!editorial || typeof editorial.verifiedOn !== "string" || !DATE.test(editorial.verifiedOn)) add(errors, "error", eventScope, "editorial.verifiedOn non valida");
    if (!editorial || !["low", "medium", "high"].includes(String(editorial.risk))) add(errors, "error", eventScope, "editorial.risk non valido");
    if (!editorial || typeof editorial.fact !== "string" || editorial.fact.length < 20) add(errors, "error", eventScope, "editorial.fact troppo debole o mancante");
    if (!editorial || typeof editorial.fallback !== "string" || editorial.fallback.length < 20) add(errors, "error", eventScope, "editorial.fallback obbligatorio");
    if (editorial?.risk === "high") add(warnings, "warning", eventScope, "rischio alto: richiede review umana prima della pubblicazione");
  });
  return { errors, warnings };
}
