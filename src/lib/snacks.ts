import type { Dish } from "./dishes";

export type Craving = "sweet" | "salty" | "crunchy" | "warm" | "refreshing" | "quick";

export interface Snack extends Dish {
  cravings: Craving[];
}

export const CRAVING_META: Record<Craving, { label: string; emoji: string }> = {
  sweet: { label: "Something sweet", emoji: "🍯" },
  salty: { label: "Salty & savoury", emoji: "🧂" },
  crunchy: { label: "Crunchy", emoji: "🥨" },
  warm: { label: "Warm & cozy", emoji: "☕" },
  refreshing: { label: "Cool & refreshing", emoji: "🍧" },
  quick: { label: "Quick (< 5 min)", emoji: "⚡" },
};

const raw: Array<[string, string, string, number, number, number, number, Craving[]]> = [
  ["s1", "Roasted Makhana", "🌰", 120, 4, 18, 2, ["crunchy", "salty", "quick"]],
  ["s2", "Masala Chai", "🍵", 90, 3, 12, 3, ["warm", "quick"]],
  ["s3", "Bhel Puri", "🥣", 220, 6, 38, 4, ["crunchy", "salty"]],
  ["s4", "Fruit Chaat", "🍎", 150, 2, 34, 1, ["refreshing", "quick", "sweet"]],
  ["s5", "Sprouts Salad", "🌱", 180, 12, 26, 3, ["refreshing", "salty"]],
  ["s6", "Dhokla", "🟨", 200, 8, 32, 4, ["salty"]],
  ["s7", "Gulab Jamun", "🍩", 180, 3, 28, 6, ["sweet", "warm"]],
  ["s8", "Kheer", "🥣", 220, 6, 34, 7, ["sweet", "warm"]],
  ["s9", "Coconut Water", "🥥", 45, 1, 11, 0, ["refreshing", "quick"]],
  ["s10", "Buttermilk (Chaas)", "🥛", 60, 3, 6, 2, ["refreshing", "quick"]],
  ["s11", "Roasted Chana", "🫘", 130, 7, 20, 2, ["crunchy", "quick"]],
  ["s12", "Banana with Peanut Butter", "🍌", 250, 8, 32, 12, ["sweet", "quick"]],
  ["s13", "Masala Papad", "🥙", 90, 4, 12, 3, ["crunchy", "salty", "quick"]],
  ["s14", "Vegetable Samosa (baked)", "🥟", 210, 5, 28, 9, ["crunchy", "warm"]],
  ["s15", "Fresh Lassi", "🥤", 180, 6, 24, 6, ["refreshing", "sweet"]],
  ["s16", "Trail Mix", "🥜", 200, 6, 18, 12, ["crunchy", "quick"]],
  ["s17", "Idli (mini)", "⚪", 140, 5, 26, 1, ["warm", "quick"]],
  ["s18", "Rasgulla", "🍡", 160, 4, 30, 3, ["sweet"]],
];

export const SNACKS: Snack[] = raw.map(([id, name, emoji, kcal, protein, carbs, fat, cravings]) => ({
  id,
  name,
  emoji,
  slots: [],
  kcal,
  protein,
  carbs,
  fat,
  tags: [],
  ingredients: [],
  cravings,
}));

export const SNACKS_BY_ID: Record<string, Snack> = Object.fromEntries(SNACKS.map((s) => [s.id, s]));

export function suggestSnacks(cravings: Craving[], maxKcal?: number): Snack[] {
  const active = cravings.length ? cravings : (Object.keys(CRAVING_META) as Craving[]);
  return SNACKS
    .filter((s) => s.cravings.some((c) => active.includes(c)))
    .filter((s) => (maxKcal ? s.kcal <= maxKcal : true))
    .sort((a, b) => {
      const aScore = a.cravings.filter((c) => active.includes(c)).length;
      const bScore = b.cravings.filter((c) => active.includes(c)).length;
      return bScore - aScore || a.kcal - b.kcal;
    });
}