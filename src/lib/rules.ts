import { DISHES_BY_ID, type Dish, type Slot } from "./dishes";
import { passesRules, dishMatches, type CustomRule } from "./custom-rules";

export interface Rule {
  id: string;
  label: string;
  description: string;
}

export const RULES: Rule[] = [
  { id: "pizza-weekly", label: "Pizza · max 1×/week", description: "Enjoy pizza, but keep it to once per week." },
  { id: "paratha-slot", label: "Paratha only breakfast or lunch", description: "Skip heavy parathas at dinner." },
  { id: "fried-breakfast", label: "Fried breakfasts · max 2×/week", description: "Puri, bhatura and tikki chaat capped at 2 mornings weekly." },
  { id: "dal-daily", label: "Dal or legume every day", description: "At least one dal/legume meal each day." },
  { id: "leafy-daily", label: "Leafy greens every day", description: "At least one leafy-green meal each day." },
  { id: "no-repeat-3", label: "No repeat within 3 days", description: "Same dish must be at least 3 days apart." },
  { id: "lighter-dinner", label: "Dinner lighter than lunch", description: "Dinner calories should not exceed lunch." },
  { id: "sweets-weekly", label: "Sweets · max 2×/week", description: "Cap dessert/sweet dishes at twice per week." },
];

export type WeekPlan = { day: number; breakfast: string; lunch: string; dinner: string }[];

function hasTag(id: string, tag: string): boolean {
  return DISHES_BY_ID[id]?.tags.includes(tag as never) ?? false;
}

function isFriedBreakfast(id: string): boolean {
  return hasTag(id, "fried-breakfast");
}

export interface RuleCheck {
  id: string;
  passed: boolean;
  detail: string;
}

/** Check the 8 rules + custom rules for a single day (day index into plan). */
export function checkDay(plan: WeekPlan, dayIdx: number, customRules: CustomRule[] = []): RuleCheck[] {
  const day = plan[dayIdx];
  const weekStart = Math.floor(dayIdx / 7) * 7;
  const week = plan.slice(weekStart, weekStart + 7);

  const dayIds = [day.breakfast, day.lunch, day.dinner];
  const dayDishes = dayIds.map((i) => DISHES_BY_ID[i]).filter(Boolean) as Dish[];

  const weekBreakfasts = week.map((d) => d.breakfast);
  const weekAll = week.flatMap((d) => [d.breakfast, d.lunch, d.dinner]);

  const pizzaCount = weekAll.filter((i) => hasTag(i, "pizza")).length;
  const parathaOk = !hasTag(day.dinner, "paratha");
  const friedCount = weekBreakfasts.filter(isFriedBreakfast).length;
  const hasDal = dayDishes.some((d) => d.tags.includes("dal") || d.tags.includes("legume"));
  const hasLeafy = dayDishes.some((d) => d.tags.includes("leafy"));
  const lunchKcal = DISHES_BY_ID[day.lunch]?.kcal ?? 0;
  const dinnerKcal = DISHES_BY_ID[day.dinner]?.kcal ?? 0;
  const lighterDinner = dinnerKcal <= lunchKcal;
  const sweetCount = weekAll.filter((i) => hasTag(i, "sweet")).length;

  // No-repeat within ±3 days across whole plan
  const window = plan.slice(Math.max(0, dayIdx - 3), Math.min(plan.length, dayIdx + 4));
  const windowIds = window.flatMap((d) => [d.breakfast, d.lunch, d.dinner]);
  const noRepeat = dayIds.every((id) => windowIds.filter((x) => x === id).length <= 1);

  const builtIn = [
    { id: "pizza-weekly", passed: pizzaCount <= 1, detail: `${pizzaCount} pizza this week` },
    { id: "paratha-slot", passed: parathaOk, detail: parathaOk ? "no dinner paratha" : "paratha at dinner" },
    { id: "fried-breakfast", passed: friedCount <= 2, detail: `${friedCount} fried breakfasts` },
    { id: "dal-daily", passed: hasDal, detail: hasDal ? "dal ✓" : "add a dal" },
    { id: "leafy-daily", passed: hasLeafy, detail: hasLeafy ? "greens ✓" : "add greens" },
    { id: "no-repeat-3", passed: noRepeat, detail: noRepeat ? "no clashes" : "repeats nearby" },
    { id: "lighter-dinner", passed: lighterDinner, detail: `dinner ${dinnerKcal} vs lunch ${lunchKcal}` },
    { id: "sweets-weekly", passed: sweetCount <= 2, detail: `${sweetCount} sweets this week` },
  ];

  const customChecks: RuleCheck[] = customRules
    .filter((r) => r.enabled)
    .map((r) => {
      let passed = true;
      let detail = "";
      const slotsToCheck: Slot[] = r.scope === "any" ? ["breakfast", "lunch", "dinner"] : [r.scope];

      if (r.kind === "avoid") {
        const hasViolatingDish = slotsToCheck.some((s) => {
          const dish = DISHES_BY_ID[day[s]];
          return dish && dishMatches(dish, r.match);
        });
        passed = !hasViolatingDish;
        detail = passed ? "avoided ✓" : "avoided dish present";
      } else if (r.kind === "require") {
        if (r.scope === "any") {
          passed = slotsToCheck.some((s) => {
            const dish = DISHES_BY_ID[day[s]];
            return dish && dishMatches(dish, r.match);
          });
        } else {
          const dish = DISHES_BY_ID[day[r.scope]];
          passed = dish ? dishMatches(dish, r.match) : false;
        }
        detail = passed ? "satisfied ✓" : "missing requirement";
      } else if (r.kind === "min-frequency" || r.kind === "max-frequency") {
        let count = 0;
        week.forEach((d) => {
          slotsToCheck.forEach((s) => {
            const dish = DISHES_BY_ID[d[s]];
            if (dish && dishMatches(dish, r.match)) count++;
          });
        });
        const limit = r.match.frequencyLimit ?? 1;
        if (r.kind === "min-frequency") {
          passed = count >= limit;
          detail = `${count}/${limit} times`;
        } else {
          passed = count <= limit;
          detail = `${count}/${limit} times`;
        }
      } else if (r.kind === "prefer") {
        const preferredCount = slotsToCheck.filter((s) => {
          const dish = DISHES_BY_ID[day[s]];
          return dish && dishMatches(dish, r.match);
        }).length;
        passed = true;
        detail = preferredCount > 0 ? "preferred ✓" : "no preferred dish";
      }

      return {
        id: r.id,
        passed,
        detail,
      };
    });

  return [...builtIn, ...customChecks];
}

/** True if placing `dish` in `slot` on `dayIdx` violates no immediate rules. */
export function isSwapAllowed(dish: Dish, slot: Slot, dayIdx: number, plan: WeekPlan, customRules: CustomRule[] = []): boolean {
  if (!dish.slots.includes(slot)) return false;

  // Rule 2: paratha not at dinner
  if (slot === "dinner" && dish.tags.includes("paratha")) return false;

  // Build hypothetical plan
  const next: WeekPlan = plan.map((d, i) => (i === dayIdx ? { ...d, [slot]: dish.id } : d));

  // Rule 6: no repeat within ±3 days
  for (let d = Math.max(0, dayIdx - 3); d <= Math.min(plan.length - 1, dayIdx + 3); d++) {
    if (d === dayIdx) continue;
    const other = [next[d].breakfast, next[d].lunch, next[d].dinner];
    if (other.includes(dish.id)) return false;
  }

  // Rule 7 (soft): dinner shouldn't exceed lunch by more than 50 kcal
  if (slot === "dinner" && dish.kcal > (DISHES_BY_ID[next[dayIdx].lunch]?.kcal ?? 0) + 50) return false;

  // User custom require/avoid rules
  if (!passesRules(dish, slot, customRules)) return false;

  // Verify custom weekly frequency rules
  const weekStart = Math.floor(dayIdx / 7) * 7;
  const currentWeek = plan.slice(weekStart, weekStart + 7);
  const nextWeek = next.slice(weekStart, weekStart + 7);

  for (const r of customRules) {
    if (!r.enabled) continue;
    if (r.kind !== "min-frequency" && r.kind !== "max-frequency") continue;

    const slotsToCheck: Slot[] = r.scope === "any" ? ["breakfast", "lunch", "dinner"] : [r.scope];
    const limit = r.match.frequencyLimit ?? 1;

    let origCount = 0;
    currentWeek.forEach((d) => {
      slotsToCheck.forEach((s) => {
        const dObj = DISHES_BY_ID[d[s]];
        if (dObj && dishMatches(dObj, r.match)) origCount++;
      });
    });

    let nextCount = 0;
    nextWeek.forEach((d) => {
      slotsToCheck.forEach((s) => {
        const dObj = DISHES_BY_ID[d[s]];
        if (dObj && dishMatches(dObj, r.match)) nextCount++;
      });
    });

    if (r.kind === "max-frequency" && nextCount > limit) return false;
    if (r.kind === "min-frequency" && nextCount < limit && nextCount < origCount) return false;
  }

  return true;
}
