/** A plan of one place: the ground, the buildings, the stairs, you, the next goal and the way out. */
export const PLAN = {
  ground: 0, tall: 1, path: 2, sand: 3, water: 4, tree: 5, building: 6, door: 7,
  bank: 8, wall: 9, stairs: 10, floor: 11, object: 12, fence: 13, void: 14
} as const;

export interface UiPlanMark {
  kind: "here" | "goal" | "door" | "road" | "npc" | "trainer";
  /** A pin on the way to the goal is drawn yellow. */
  goal?: boolean;
  x: number;
  y: number;
  /** Door and road pins carry the number of their row in the list. */
  n?: number;
  /** Road pins point where the road goes. */
  edge?: "north" | "south";
}

export interface UiPlan {
  cols: number;
  rows: number;
  /** One PLAN index per tile, row by row. */
  tiles: readonly number[];
  /** Height of each tile above the valley floor: higher ground is drawn lighter. */
  levels: readonly number[];
  marks: readonly UiPlanMark[];
  /** Short key under the plan: a symbol, then what it means. */
  key?: readonly { text: string; tone?: "red" | "yellow" }[];
}

const T = 20;
const INK = "#14161F", PAPER = "#F4EEDC", RED = "#D7263D", YELLOW = "#FFD23F";
const FILL: Record<number, string> = {
  [PLAN.ground]: "#A9C48A", [PLAN.tall]: "#6E9C5A", [PLAN.path]: "#D9C08E", [PLAN.sand]: "#E8D6A6", [PLAN.water]: "#86B8CF",
  [PLAN.tree]: "#5A8A5A", [PLAN.building]: "#EBDDB8", [PLAN.door]: "#14161F", [PLAN.bank]: "#9A7A56", [PLAN.wall]: "#B8A98B",
  [PLAN.stairs]: "#EADFC4", [PLAN.floor]: "#DCCBA6", [PLAN.object]: "#8D8470", [PLAN.fence]: "#A9C48A", [PLAN.void]: "#CFC7B0"
};

function pin(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, fill: string, text?: string): void {
  ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
  if (text) { ctx.fillStyle = INK; ctx.font = `700 ${Math.round(radius * 1.25)}px Tribuna, sans-serif`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(text, cx, cy + 1); }
}

export function drawPlan(canvas: HTMLCanvasElement, plan: UiPlan): void {
  canvas.width = plan.cols * T; canvas.height = plan.rows * T;
  const ctx = canvas.getContext("2d"); if (!ctx) return;
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= plan.cols || y >= plan.rows ? PLAN.void : plan.tiles[y * plan.cols + x]);
  const level = (x: number, y: number) => (x < 0 || y < 0 || x >= plan.cols || y >= plan.rows ? 0 : plan.levels[y * plan.cols + x]);
  ctx.fillStyle = FILL[PLAN.void]; ctx.fillRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < plan.rows; y++) for (let x = 0; x < plan.cols; x++) {
    const kind = at(x, y), px = x * T, py = y * T;
    ctx.fillStyle = FILL[kind] ?? FILL[PLAN.ground]; ctx.fillRect(px, py, T, T);
    if (kind === PLAN.tall) { ctx.fillStyle = "#4F7F48"; for (const [dx, dy] of [[5, 6], [13, 5], [8, 13], [15, 14]]) ctx.fillRect(px + dx, py + dy, 2, 5); }
    else if (kind === PLAN.water) { ctx.fillStyle = "#B9DAE8"; ctx.fillRect(px + 4, py + 7, 8, 2); ctx.fillRect(px + 9, py + 14, 8, 2); }
    else if (kind === PLAN.tree) { ctx.fillStyle = "#3F6E45"; ctx.beginPath(); ctx.arc(px + T / 2, py + T / 2, T * 0.36, 0, Math.PI * 2); ctx.fill(); }
    else if (kind === PLAN.stairs) { ctx.fillStyle = "#8F8266"; for (let i = 1; i < 5; i++) ctx.fillRect(px, py + i * 4 - 1, T, 2); }
    else if (kind === PLAN.bank || kind === PLAN.wall) { ctx.fillStyle = kind === PLAN.bank ? "#6D5338" : "#8A7C64"; ctx.fillRect(px, py + T - 5, T, 5); ctx.fillStyle = "rgba(255,255,255,.35)"; ctx.fillRect(px, py, T, 3); }
    else if (kind === PLAN.fence) { ctx.fillStyle = "#6D5F48"; ctx.fillRect(px + 2, py + T / 2 - 1, T - 4, 3); }
    else if (kind === PLAN.object) { ctx.fillStyle = "#6F6755"; ctx.fillRect(px + 3, py + 3, T - 6, T - 6); }
    const higher = level(x, y);
    if (higher > 0 && kind !== PLAN.bank && kind !== PLAN.wall) { ctx.fillStyle = `rgba(255,250,225,${Math.min(0.42, 0.18 * higher)})`; ctx.fillRect(px, py, T, T); }
  }
  // Buildings: one outline around the block, not around every tile.
  ctx.fillStyle = INK;
  for (let y = 0; y < plan.rows; y++) for (let x = 0; x < plan.cols; x++) {
    const kind = at(x, y); if (kind !== PLAN.building && kind !== PLAN.door) continue;
    const same = (nx: number, ny: number) => { const other = at(nx, ny); return other === PLAN.building || other === PLAN.door; };
    const px = x * T, py = y * T;
    if (!same(x, y - 1)) ctx.fillRect(px, py, T, 3);
    if (!same(x, y + 1)) ctx.fillRect(px, py + T - 3, T, 3);
    if (!same(x - 1, y)) ctx.fillRect(px, py, 3, T);
    if (!same(x + 1, y)) ctx.fillRect(px + T - 3, py, 3, T);
  }
  // Height steps: a dark line where the ground drops.
  ctx.fillStyle = "rgba(20,22,31,.55)";
  for (let y = 0; y < plan.rows; y++) for (let x = 0; x < plan.cols; x++) {
    const kind = at(x, y); if (kind !== PLAN.bank && kind !== PLAN.wall) continue;
    ctx.fillRect(x * T, y * T, T, 2);
  }
  for (const mark of plan.marks) {
    const cx = mark.x * T + T / 2, cy = mark.y * T + T / 2;
    if (mark.kind === "npc") { ctx.fillStyle = "rgba(20,22,31,.75)"; ctx.beginPath(); ctx.arc(cx, cy, 3.5, 0, Math.PI * 2); ctx.fill(); }
    else if (mark.kind === "trainer") { ctx.fillStyle = RED; ctx.beginPath(); ctx.arc(cx, cy, 5, 0, Math.PI * 2); ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = INK; ctx.stroke(); }
  }
  for (const mark of plan.marks) {
    const cx = mark.x * T + T / 2, cy = mark.y * T + T / 2;
    if (mark.kind === "door") pin(ctx, cx, cy - 2, 11, mark.goal ? YELLOW : PAPER, String(mark.n ?? ""));
    else if (mark.kind === "road") {
      pin(ctx, cx, cy, 11, mark.goal ? YELLOW : PAPER, String(mark.n ?? ""));
      ctx.fillStyle = INK; ctx.beginPath();
      const dir = mark.edge === "north" ? -1 : 1, base = cy + dir * 15;
      ctx.moveTo(cx - 7, base); ctx.lineTo(cx + 7, base); ctx.lineTo(cx, base + dir * 9); ctx.closePath(); ctx.fill();
    }
  }
  for (const mark of plan.marks) {
    const cx = mark.x * T + T / 2, cy = mark.y * T + T / 2;
    if (mark.kind === "goal") {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) { const r = i % 2 ? 6 : 14, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
      ctx.closePath(); ctx.fillStyle = YELLOW; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke();
    }
  }
  for (const mark of plan.marks) if (mark.kind === "here") pin(ctx, mark.x * T + T / 2, mark.y * T + T / 2, 10, RED);
}

/** The plan as a block: canvas first, then a key of what the colours and marks mean. */
export function renderPlan(plan: UiPlan, label: string): HTMLElement {
  const box = document.createElement("figure"); box.className = "ui-plan"; box.setAttribute("aria-label", label);
  const canvas = document.createElement("canvas"); canvas.className = "ui-plan-canvas"; canvas.setAttribute("role", "img"); canvas.setAttribute("aria-label", label);
  drawPlan(canvas, plan);
  box.append(canvas);
  if (plan.key?.length) {
    const key = document.createElement("figcaption"); key.className = "ui-plan-key";
    for (const entry of plan.key) { const chip = document.createElement("span"); chip.textContent = entry.text; if (entry.tone) chip.className = `tone-${entry.tone}`; key.append(chip); }
    box.append(key);
  }
  return box;
}
