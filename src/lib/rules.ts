import { DISHES_BY_ID, type Dish, type Slot } from "./dishes";
import { passesRules, dishMatches, type CustomRule } from "./custom-rules";

export interface Rule {
  id: string;
  label: string;
  description: string;
}

// ponytail: RULES array is now kept for back-compat/types if imported, but is empty or mapped to custom rules.
export const RULES: Rule[] = [];

export type WeekPlan = { day: number; breakfast: string; lunch: string; dinner: string }[];

export interface RuleCheck {
  id: string;
  passed: boolean;
  detail: string;
}

/** Check all custom rules for a single day (day index into plan). */
export function checkDay(plan: WeekPlan, dayIdx: number, customRules: CustomRule[] = []): RuleCheck[] {
  const day = plan[dayIdx];
  const weekStart = Math.floor(dayIdx / 7) * 7;
  const week = plan.slice(weekStart, weekStart + 7);

  const dayIds = [day.breakfast, day.lunch, day.dinner];

  return customRules
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
      } else if (r.kind === "no-repeat") {
        const days = r.match.minDaysBetweenRepeat ?? 3;
        const window = plan.slice(Math.max(0, dayIdx - days), Math.min(plan.length, dayIdx + days + 1));
        const windowIds = window.flatMap((d) => [d.breakfast, d.lunch, d.dinner]);
        const noRepeat = dayIds.every((id) => windowIds.filter((x) => x === id).length <= 1);
        passed = noRepeat;
        detail = noRepeat ? "no clashes" : `repeats within ${days} days`;
      } else if (r.kind === "lighter-dinner") {
        const dinnerKcal = DISHES_BY_ID[day.dinner]?.kcal ?? 0;
        const lunchKcal = DISHES_BY_ID[day.lunch]?.kcal ?? 0;
        const maxDiff = r.match.maxKcalDifference ?? 0;
        passed = dinnerKcal <= lunchKcal + maxDiff;
        detail = passed ? `dinner (${dinnerKcal} kcal) ≤ lunch (${lunchKcal} kcal)` : `dinner heavier than lunch`;
      }

      return {
        id: r.id,
        passed,
        detail,
      };
    });
}

/** True if placing `dish` in `slot` on `dayIdx` violates no immediate rules. */
export function isSwapAllowed(dish: Dish, slot: Slot, dayIdx: number, plan: WeekPlan, customRules: CustomRule[] = []): boolean {
  if (!dish.slots.includes(slot)) return false;

  // Build hypothetical plan
  const next: WeekPlan = plan.map((d, i) => (i === dayIdx ? { ...d, [slot]: dish.id } : d));

  // User custom require/avoid rules
  if (!passesRules(dish, slot, customRules)) return false;

  // Verify custom weekly frequency rules & other constraints
  const weekStart = Math.floor(dayIdx / 7) * 7;
  const currentWeek = plan.slice(weekStart, weekStart + 7);
  const nextWeek = next.slice(weekStart, weekStart + 7);

  for (const r of customRules) {
    if (!r.enabled) continue;

    if (r.kind === "no-repeat") {
      const days = r.match.minDaysBetweenRepeat ?? 3;
      for (let d = Math.max(0, dayIdx - days); d <= Math.min(plan.length - 1, dayIdx + days); d++) {
        if (d === dayIdx) continue;
        const other = [next[d].breakfast, next[d].lunch, next[d].dinner];
        if (other.includes(dish.id)) return false;
      }
    }

    if (r.kind === "lighter-dinner") {
      const nextLunch = DISHES_BY_ID[next[dayIdx].lunch];
      const nextDinner = DISHES_BY_ID[next[dayIdx].dinner];
      if (nextLunch && nextDinner) {
        const maxDiff = r.match.maxKcalDifference ?? 50; // soft limit of 50 kcal during swap checks if not specified
        if (nextDinner.kcal > nextLunch.kcal + maxDiff) return false;
      }
    }

    if (r.kind === "min-frequency" || r.kind === "max-frequency") {
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
  }

  return true;
}
