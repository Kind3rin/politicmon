/** Legacy headings arrive in capitals. Native text keeps sentence shapes,
 * while short game abbreviations retain their familiar spelling. */
export function readableCopy(text: string): string {
  if (text !== text.toLocaleUpperCase("it")) return text;
  return text.toLocaleLowerCase("it")
    .replace(/(^|[.!?]\s+)([a-zàèéìòù])/g, (_, prefix: string, letter: string) => prefix + letter.toLocaleUpperCase("it"))
    .replace(/\b(pv|pp|ko|pve|pvp|pdf|iva)\b/gi, token => token.toUpperCase())
    // "LV9" is a level, written Lv9 everywhere else in the interface.
    .replace(/\blv(\d+)\b/g, (_, level: string) => `Lv${level}`);
}
