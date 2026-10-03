// Shared phrases and emotes for native communication panels.
export const PHRASES = [
  "CIAO!",
  "COME VA?",
  "SCAMBIAMO?",
  "TI SFIDO!",
  "DOVE SEI?",
  "ARRIVO!",
  "BELLA SQUADRA!",
  "BELLA PARTITA!",
  "DEVO ANDARE",
  "A DOPO!"
];

export const GROUPED_PHRASES = [
  { group: "Saluti", indices: [0, 1, 6, 7] },
  { group: "Organizzarsi", indices: [2, 3, 4, 5] },
  { group: "Congedarsi", indices: [8, 9] }
].flatMap(({ group, indices }) => indices.map(index => ({ group, text: PHRASES[index] })));

export const EMOTES: Array<{ ch: string; label: string }> = [
  { ch: "!", label: "CIAO" },
  { ch: "?", label: "BOH" },
  { ch: "★", label: "TOP" },
  { ch: "♪", label: "FESTA" },
  { ch: "▲", label: "SU" },
  { ch: "▼", label: "GIÙ" },
  { ch: "GG", label: "BELLA PARTITA" },
  { ch: "OK", label: "VA BENE" },
  { ch: "NO", label: "NO" },
  { ch: "€", label: "RICCO" },
  { ch: "!!", label: "WOW" }
];
