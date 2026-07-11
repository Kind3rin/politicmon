export type MemeCondition =
  | { readonly kind: "flag"; readonly id: string; readonly value: boolean }
  | { readonly kind: "minBadges"; readonly value: number }
  | { readonly kind: "sondaggi"; readonly min?: number; readonly max?: number };

export type MemeEffect =
  | { readonly kind: "sondaggi"; readonly delta: number }
  | { readonly kind: "money"; readonly delta: number }
  | { readonly kind: "flag"; readonly id: string; readonly value: boolean }
  | { readonly kind: "item"; readonly id: string; readonly qty: number }
  | { readonly kind: "territory"; readonly id: string; readonly delta: number };

export interface MemeEventChoice {
  readonly label: string;
  readonly lines: readonly string[];
  readonly effects: readonly MemeEffect[];
}

export interface MemeEventDef {
  readonly id: string;
  readonly title: string;
  readonly lines: readonly string[];
  readonly active?: { readonly from: string; readonly until: string };
  readonly conditions: readonly MemeCondition[];
  readonly choices: readonly [MemeEventChoice, MemeEventChoice];
  readonly tags: readonly string[];
  readonly source: { readonly label: string; readonly url: `https://${string}` };
  readonly editorial: {
    readonly verifiedOn: string;
    readonly risk: "low" | "medium" | "high";
    readonly fact: string;
    readonly fallback: string;
  };
}
