import { DISHES, DISHES_BY_ID } from "./dishes";
import { type DayPlan } from "./plan";
import { type CustomRule, passesRules } from "./custom-rules";
import type { Slot } from "./dishes";

// ponytail: isSwapAllowed is too strict for full-plan generation (cross-day no-repeat +
// frequency limits deadlock the greedy loop). Instead we shuffle with slot-fit + per-dish
// avoid/require checks, then let the user eyeball the preview. The Rule Tracker on the
// home page will flag any remaining violations after applying.

const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Shuffles meals for the target range. Uses slot compatibility + per-dish
 * avoid/require custom rules. Tries to avoid same-dish repeats within
 * ±2 days and keeps dinner ≤ lunch kcal when possible, but falls back
 * gracefully if no perfect candidate exists.
 */
export function generateShuffledPlan(
  currentPlan: DayPlan[],
  range: "7days" | "42days",
  startDayIdx: number,
  customRules: CustomRule[]
): DayPlan[] {
  const targetIndices: number[] =
    range === "7days"
      ? Array.from({ length: 7 }, (_, i) => (startDayIdx + i) % 42)
      : Array.from({ length: 42 }, (_, i) => i);

  const result: DayPlan[] = JSON.parse(JSON.stringify(currentPlan));

  // Pre-bucket dishes by slot
  const pool: Record<Slot, typeof DISHES> = {
    breakfast: DISHES.filter((d) => d.slots.includes("breakfast")),
    lunch: DISHES.filter((d) => d.slots.includes("lunch")),
    dinner: DISHES.filter((d) => d.slots.includes("dinner")),
  };

  for (const dIdx of targetIndices) {
    for (const slot of SLOTS) {
      // 1. Filter by slot-level avoid/require rules
      let candidates = pool[slot].filter((d) => passesRules(d, slot, customRules));

      // 2. Try to avoid repeating same dish within ±2 days (soft)
      const nearby = new Set<string>();
      for (let offset = -2; offset <= 2; offset++) {
        const ni = dIdx + offset;
        if (ni < 0 || ni >= 42 || ni === dIdx) continue;
        nearby.add(result[ni].breakfast);
        nearby.add(result[ni].lunch);
        nearby.add(result[ni].dinner);
      }
      const noRepeatCandidates = candidates.filter((d) => !nearby.has(d.id));
      if (noRepeatCandidates.length > 0) candidates = noRepeatCandidates;

      // 3. For dinner, prefer dishes lighter than today's lunch (soft)
      if (slot === "dinner") {
        const lunchKcal = DISHES_BY_ID[result[dIdx].lunch]?.kcal ?? 600;
        const lighter = candidates.filter((d) => d.kcal <= lunchKcal);
        if (lighter.length > 0) candidates = lighter;
      }

      // 4. Exclude current dish so the shuffle actually changes something
      const differentCandidates = candidates.filter((d) => d.id !== currentPlan[dIdx][slot]);
      if (differentCandidates.length > 0) candidates = differentCandidates;

      if (candidates.length > 0) {
        result[dIdx][slot] = pickRandom(candidates).id;
      }
    }
  }

  return result;
}

