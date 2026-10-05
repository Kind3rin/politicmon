/** Drag a row of a list to another place. Touch, mouse and pen share one path; the list never scrolls meanwhile. */

/** Index a dragged row would take when its centre is at `centre`: the last row that starts above it. */
export function dropIndex(centre: number, rests: readonly { top: number; bottom: number }[]): number {
  let index = 0;
  rests.forEach((rect, i) => { if (centre >= rect.top) index = i; });
  return index;
}

const THRESHOLD = 8;

export function enableRowDrag(list: HTMLElement, rows: readonly HTMLElement[], onMove: (from: number, to: number) => void): void {
  list.classList.add("ui-reordering");
  rows.forEach((row, from) => {
    let pointer: number | null = null, startY = 0, dragging = false, target = from, suppress = false;
    let rests: { top: number; bottom: number }[] = [], restTop = 0, restHeight = 0;
    const clear = () => {
      row.style.transform = ""; row.classList.remove("ui-row-dragging"); list.classList.remove("ui-dragging");
      for (const other of rows) other.classList.remove("ui-row-drop", "ui-row-drop-after");
    };
    row.addEventListener("contextmenu", event => event.preventDefault());
    row.addEventListener("pointerdown", event => {
      if (event.button !== 0 || pointer !== null) return;
      pointer = event.pointerId; startY = event.clientY; dragging = false; target = from;
    });
    row.addEventListener("pointermove", event => {
      if (event.pointerId !== pointer) return;
      const dy = event.clientY - startY;
      if (!dragging) {
        if (Math.abs(dy) < THRESHOLD) return;
        dragging = true;
        rests = rows.map(item => { const rect = item.getBoundingClientRect(); return { top: rect.top, bottom: rect.bottom }; });
        restTop = rests[from].top; restHeight = rests[from].bottom - rests[from].top;
        try { row.setPointerCapture(event.pointerId); } catch { /* a synthetic pointer cannot be captured */ }
        row.classList.add("ui-row-dragging"); list.classList.add("ui-dragging");
      }
      event.preventDefault();
      row.style.transform = `translateY(${dy}px)`;
      target = dropIndex(restTop + restHeight / 2 + dy, rests);
      rows.forEach((other, index) => {
        const here = index === target && target !== from;
        other.classList.toggle("ui-row-drop", here && target < from);
        other.classList.toggle("ui-row-drop-after", here && target > from);
      });
      list.dataset.dropFrom = String(from); list.dataset.dropTo = String(target);
    });
    const finish = (commit: boolean) => (event: PointerEvent) => {
      if (event.pointerId !== pointer) return;
      pointer = null;
      if (!dragging) return;
      dragging = false; suppress = true;
      clear(); delete list.dataset.dropFrom; delete list.dataset.dropTo;
      if (commit && target !== from) onMove(from, target);
    };
    row.addEventListener("pointerup", finish(true));
    row.addEventListener("pointercancel", finish(false));
    // A drag ends with a click on the same row: it must not also pick the row.
    row.addEventListener("click", event => {
      if (!suppress) return;
      suppress = false; event.stopImmediatePropagation(); event.preventDefault();
    }, true);
  });
}
