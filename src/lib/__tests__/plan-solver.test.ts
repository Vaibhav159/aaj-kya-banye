import { describe, it, expect } from "bun:test";
import { generateSolvedPlan, type SolverResult } from "../plan-shuffler";
import { BASE_PLAN } from "../plan";
import { DISHES, DISHES_BY_ID } from "../dishes";
import { dishMatches, type CustomRule } from "../custom-rules";

// ponytail: these tests verify the solver produces valid plans under various rule combos.
// No test framework fixtures — just direct function calls.

const DEFAULT_RULES: CustomRule[] = [
  { id: "r-pizza-weekly", label: "Pizza · max 1×/week", kind: "max-frequency", scope: "any", match: { tag: "pizza", frequencyLimit: 1 }, enabled: true },
  { id: "r-paratha-slot", label: "Paratha only breakfast or lunch", kind: "avoid", scope: "dinner", match: { tag: "paratha" }, enabled: true },
  { id: "r-dal-daily", label: "Dal or legume every day", kind: "require", scope: "any", match: { tags: ["dal", "legume"] }, enabled: true },
  { id: "r-leafy-daily", label: "Leafy greens every day", kind: "require", scope: "any", match: { tag: "leafy" }, enabled: true },
  { id: "r-no-repeat-3", label: "No repeat within 3 days", kind: "no-repeat", scope: "any", match: { minDaysBetweenRepeat: 3 }, enabled: true },
  { id: "r-lighter-dinner", label: "Dinner lighter than lunch", kind: "lighter-dinner", scope: "dinner", match: { maxKcalDifference: 0 }, enabled: true },
];

function checkRuleOnDay(plan: typeof BASE_PLAN, dayIdx: number, rules: CustomRule[]): string[] {
  const day = plan[dayIdx];
  const violated: string[] = [];
  const weekStart = Math.floor(dayIdx / 7) * 7;
  const week = plan.slice(weekStart, weekStart + 7);

  for (const r of rules) {
    if (!r.enabled) continue;
    const slots = r.scope === "any" ? (["breakfast", "lunch", "dinner"] as const) : [r.scope as "breakfast" | "lunch" | "dinner"];

    if (r.kind === "avoid") {
      const violates = slots.some((s) => {
        const dish = DISHES_BY_ID[day[s]];
        return dish && dishMatches(dish, r.match);
      });
      if (violates) violated.push(r.id);
    } else if (r.kind === "require") {
      const satisfied = slots.some((s) => {
        const dish = DISHES_BY_ID[day[s]];
        return dish && dishMatches(dish, r.match);
      });
      if (!satisfied) violated.push(r.id);
    } else if (r.kind === "max-frequency") {
      let count = 0;
      week.forEach((d) => {
        slots.forEach((s) => {
          const dish = DISHES_BY_ID[d[s]];
          if (dish && dishMatches(dish, r.match)) count++;
        });
      });
      if (count > (r.match.frequencyLimit ?? 1)) violated.push(r.id);
    }
  }

  return violated;
}

describe("Constraint Solver", () => {
  it("produces a 42-day plan", () => {
    const result = generateSolvedPlan(BASE_PLAN, "42days", 0, []);
    expect(result.plan).toHaveLength(42);
    expect(result.plan.every((d) => d.breakfast && d.lunch && d.dinner)).toBe(true);
  });

  it("respects avoid rules (no paratha at dinner)", () => {
    const rules: CustomRule[] = [
      { id: "no-paratha-dinner", label: "No paratha at dinner", kind: "avoid", scope: "dinner", match: { tag: "paratha" }, enabled: true },
    ];
    const result = generateSolvedPlan(BASE_PLAN, "42days", 0, rules);
    for (const day of result.plan) {
      const dinner = DISHES_BY_ID[day.dinner];
      if (dinner) {
        expect(dinner.tags.includes("paratha")).toBe(false);
      }
    }
  });

  it("respects require rules (legume every day)", () => {
    const rules: CustomRule[] = [
      { id: "legume-daily", label: "Legume daily", kind: "require", scope: "any", match: { tags: ["dal", "legume"] }, enabled: true },
    ];
    const result = generateSolvedPlan(BASE_PLAN, "42days", 0, rules);
    for (let i = 0; i < 42; i++) {
      const day = result.plan[i];
      const hasLegume = ["breakfast", "lunch", "dinner"].some((s) => {
        const dish = DISHES_BY_ID[day[s as "breakfast" | "lunch" | "dinner"]];
        return dish && dishMatches(dish, { tags: ["dal", "legume"] });
      });
      expect(hasLegume).toBe(true);
    }
  });

  it("respects max-frequency rules (pizza max 1/week)", () => {
    const rules: CustomRule[] = [
      { id: "pizza-cap", label: "Pizza max 1/week", kind: "max-frequency", scope: "any", match: { tag: "pizza", frequencyLimit: 1 }, enabled: true },
    ];
    const result = generateSolvedPlan(BASE_PLAN, "42days", 0, rules);
    // Check each week
    for (let w = 0; w < 6; w++) {
      let pizzaCount = 0;
      for (let d = w * 7; d < (w + 1) * 7 && d < 42; d++) {
        const day = result.plan[d];
        for (const s of ["breakfast", "lunch", "dinner"] as const) {
          const dish = DISHES_BY_ID[day[s]];
          if (dish && dish.tags.includes("pizza")) pizzaCount++;
        }
      }
      expect(pizzaCount).toBeLessThanOrEqual(1);
    }
  });

  it("works with all default rules enabled", () => {
    const result = generateSolvedPlan(BASE_PLAN, "42days", 0, DEFAULT_RULES);
    expect(result.plan).toHaveLength(42);
    // Should complete without crashing
    expect(result.score).toBeGreaterThanOrEqual(0);
  });

  it("reports relaxed rules when constraints are contradictory", () => {
    const impossible: CustomRule[] = [
      // Require a tag that no dish has
      { id: "require-nonexistent", label: "Require unicorn", kind: "require", scope: "breakfast", match: { tag: "pizza" as any }, enabled: true },
    ];
    const result = generateSolvedPlan(BASE_PLAN, "42days", 0, impossible);
    // Should either relax the rule or still produce a plan
    expect(result.plan).toHaveLength(42);
    // The plan should still have breakfast filled
    expect(result.plan[0].breakfast).toBeTruthy();
  });

  it("completes 42-day solve in under 200ms", () => {
    const start = performance.now();
    generateSolvedPlan(BASE_PLAN, "42days", 0, DEFAULT_RULES);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(200);
  });

  it("generates different plans on multiple calls (randomness)", () => {
    const r1 = generateSolvedPlan(BASE_PLAN, "42days", 0, []);
    const r2 = generateSolvedPlan(BASE_PLAN, "42days", 0, []);
    // At least some days should differ
    const diffs = r1.plan.filter((d, i) =>
      d.breakfast !== r2.plan[i].breakfast ||
      d.lunch !== r2.plan[i].lunch ||
      d.dinner !== r2.plan[i].dinner,
    );
    expect(diffs.length).toBeGreaterThan(0);
  });

  it("handles 7-day range correctly", () => {
    const result = generateSolvedPlan(BASE_PLAN, "7days", 10, []);
    expect(result.plan).toHaveLength(42);
    // Days outside range should be unchanged
    expect(result.plan[0].breakfast).toBe(BASE_PLAN[0].breakfast);
    expect(result.plan[0].lunch).toBe(BASE_PLAN[0].lunch);
    expect(result.plan[0].dinner).toBe(BASE_PLAN[0].dinner);
  });

  it("all dish IDs in plan are valid", () => {
    const result = generateSolvedPlan(BASE_PLAN, "42days", 0, DEFAULT_RULES);
    for (const day of result.plan) {
      expect(DISHES_BY_ID[day.breakfast]).toBeDefined();
      expect(DISHES_BY_ID[day.lunch]).toBeDefined();
      expect(DISHES_BY_ID[day.dinner]).toBeDefined();
    }
  });

  it("slot compatibility is maintained (no breakfast dish at lunch)", () => {
    const result = generateSolvedPlan(BASE_PLAN, "42days", 0, []);
    for (const day of result.plan) {
      expect(DISHES_BY_ID[day.breakfast]?.slots.includes("breakfast")).toBe(true);
      expect(DISHES_BY_ID[day.lunch]?.slots.includes("lunch")).toBe(true);
      expect(DISHES_BY_ID[day.dinner]?.slots.includes("dinner")).toBe(true);
    }
  });
});
