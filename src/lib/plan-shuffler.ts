import { DISHES, DISHES_BY_ID } from "./dishes";
import { type DayPlan } from "./plan";
import {
  type CustomRule,
  passesRules,
  dishMatches,
  classifyRule,
  preferenceScore,
  checkFeasibility,
} from "./custom-rules";
import type { Dish, Slot } from "./dishes";

// ponytail: 3-phase constraint solver replaces the old greedy shuffler.
// Phase 1 — backtracking with MRV picks the most-constrained cell first.
// Phase 2 — hill-climbing swaps to optimize soft rules (prefer, lighter-dinner, no-repeat).
// Phase 3 — return result + list of relaxed rules.
// Ceiling: O(days × slots × pool²) worst case, but MRV pruning + 5000-iteration cap
// keeps it well under 50ms for 42 days. Upgrade path: arc-consistency (AC-3) if pool grows past ~200.

const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];
const MAX_BACKTRACK = 5000;

export interface SolverResult {
  plan: DayPlan[];
  relaxed: string[];   // rule IDs that were softened to find a solution
  violations: string[]; // rule IDs that still fail
  score: number;        // 0–100 quality metric
}

// ---------- Phase 1: Backtracking with MRV ----------

interface Cell {
  dayIdx: number;
  slot: Slot;
  candidates: string[]; // dish IDs
}

/** Pre-filter dish pool per slot using only avoid/require (hard per-dish) rules. */
function buildPool(rules: CustomRule[]): Record<Slot, Dish[]> {
  return {
    breakfast: DISHES.filter((d) => d.slots.includes("breakfast") && passesRules(d, "breakfast", rules)),
    lunch: DISHES.filter((d) => d.slots.includes("lunch") && passesRules(d, "lunch", rules)),
    dinner: DISHES.filter((d) => d.slots.includes("dinner") && passesRules(d, "dinner", rules)),
  };
}

/** Check if assigning dishId to (dayIdx, slot) in grid violates any hard cross-day rules. */
function checkHardCrossDay(
  grid: (string | null)[][],  // grid[dayIdx][slotIdx]
  dayIdx: number,
  slotIdx: number,
  dishId: string,
  hardRules: CustomRule[],
  targetIndices: number[],
  pool: Record<Slot, Dish[]>,
): boolean {
  const targetSet = new Set(targetIndices);

  for (const r of hardRules) {
    if (!r.enabled) continue;

    // No-repeat within N days
    if (r.kind === "no-repeat") {
      const days = r.match.minDaysBetweenRepeat ?? 3;
      for (let d = Math.max(0, dayIdx - days); d <= Math.min(41, dayIdx + days); d++) {
        if (d === dayIdx) continue;
        if (!targetSet.has(d)) continue; // only check target cells
        for (let s = 0; s < 3; s++) {
          if (d === dayIdx && s === slotIdx) continue;
          if (grid[d][s] === dishId) return false;
        }
      }
      // Also check within same day, other slots
      for (let s = 0; s < 3; s++) {
        if (s === slotIdx) continue;
        if (grid[dayIdx][s] === dishId) return false;
      }
    }

    // Max-frequency within current week
    if (r.kind === "max-frequency") {
      const limit = r.match.frequencyLimit ?? 1;
      const weekStart = Math.floor(dayIdx / 7) * 7;
      const weekEnd = weekStart + 7;
      const slotsToCheck: number[] = r.scope === "any"
        ? [0, 1, 2]
        : [SLOTS.indexOf(r.scope as Slot)];

      let count = 0;
      const dish = DISHES_BY_ID[dishId];
      if (dish && dishMatches(dish, r.match)) count++; // the one we're placing

      for (let d = weekStart; d < weekEnd && d < grid.length; d++) {
        if (d === dayIdx) {
          // Count other assigned slots on same day
          for (const si of slotsToCheck) {
            if (si === slotIdx) continue;
            const id = grid[d][si];
            if (id) {
              const dd = DISHES_BY_ID[id];
              if (dd && dishMatches(dd, r.match)) count++;
            }
          }
        } else if (targetSet.has(d)) {
          for (const si of slotsToCheck) {
            const id = grid[d][si];
            if (id) {
              const dd = DISHES_BY_ID[id];
              if (dd && dishMatches(dd, r.match)) count++;
            }
          }
        }
      }
      if (count > limit) return false;
    }

    // Daily require rules (scope === "any"): at least one meal in the day must match
    if (r.kind === "require" && r.scope === "any") {
      const daySlots = [grid[dayIdx][0], grid[dayIdx][1], grid[dayIdx][2]];
      daySlots[slotIdx] = dishId;
      const hasMatch = daySlots.some((id) => {
        const d = id ? DISHES_BY_ID[id] : null;
        return d ? dishMatches(d, r.match) : false;
      });
      if (!hasMatch) {
        let canMatchLater = false;
        for (let s = 0; s < 3; s++) {
          if (daySlots[s] === null) {
            const slotName = SLOTS[s];
            if (pool[slotName].some((d) => dishMatches(d, r.match))) {
              canMatchLater = true;
              break;
            }
          }
        }
        if (!canMatchLater) return false;
      }
    }

    // Lighter dinner
    if (r.kind === "lighter-dinner" && slotIdx === 2) {
      const lunchId = grid[dayIdx][1];
      if (lunchId) {
        const lunchKcal = DISHES_BY_ID[lunchId]?.kcal ?? 600;
        const dinnerKcal = DISHES_BY_ID[dishId]?.kcal ?? 0;
        const maxDiff = r.match.maxKcalDifference ?? 0;
        if (dinnerKcal > lunchKcal + maxDiff) return false;
      }
    }
    if (r.kind === "lighter-dinner" && slotIdx === 1) {
      // If we're placing lunch, check if dinner is already placed and would violate
      const dinnerId = grid[dayIdx][2];
      if (dinnerId) {
        const lunchKcal = DISHES_BY_ID[dishId]?.kcal ?? 600;
        const dinnerKcal = DISHES_BY_ID[dinnerId]?.kcal ?? 0;
        const maxDiff = r.match.maxKcalDifference ?? 0;
        if (dinnerKcal > lunchKcal + maxDiff) return false;
      }
    }
  }

  return true;
}

function solve(
  targetIndices: number[],
  pool: Record<Slot, Dish[]>,
  hardRules: CustomRule[],
  existingPlan: DayPlan[],
): { grid: (string | null)[][]; succeeded: boolean } {
  // Initialize grid from existing plan (non-target cells keep their values)
  const grid: (string | null)[][] = Array.from({ length: existingPlan.length }, (_, i) => {
    const day = existingPlan[i];
    if (!targetIndices.includes(i)) {
      return [day.breakfast, day.lunch, day.dinner];
    }
    return [null, null, null];
  });

  const targetSet = new Set(targetIndices);

  // Build cells to fill
  const cells: Cell[] = [];
  for (const dIdx of targetIndices) {
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const slot = SLOTS[sIdx];
      const candidates = pool[slot].map((d) => d.id);
      cells.push({ dayIdx: dIdx, slot, candidates });
    }
  }

  // Sort by MRV (fewest candidates first) for initial ordering
  cells.sort((a, b) => a.candidates.length - b.candidates.length);

  let backtracks = 0;

  function bt(idx: number): boolean {
    if (idx >= cells.length) return true;
    if (backtracks > MAX_BACKTRACK) return false;

    const cell = cells[idx];
    const slotIdx = SLOTS.indexOf(cell.slot);

    // Shuffle candidates for randomness
    const shuffled = [...cell.candidates];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Prioritize candidates matching unsatisfied daily require rules
    const dayAssigned = [grid[cell.dayIdx][0], grid[cell.dayIdx][1], grid[cell.dayIdx][2]];
    const unsatisfiedRequireRules = hardRules.filter((r) => {
      if (r.kind !== "require" || r.scope !== "any") return false;
      return !dayAssigned.some((id) => id && DISHES_BY_ID[id] && dishMatches(DISHES_BY_ID[id]!, r.match));
    });

    if (unsatisfiedRequireRules.length > 0) {
      shuffled.sort((a, b) => {
        const dishA = DISHES_BY_ID[a];
        const dishB = DISHES_BY_ID[b];
        const aMatches = dishA ? unsatisfiedRequireRules.some((r) => dishMatches(dishA, r.match)) : false;
        const bMatches = dishB ? unsatisfiedRequireRules.some((r) => dishMatches(dishB, r.match)) : false;
        if (aMatches && !bMatches) return -1;
        if (!aMatches && bMatches) return 1;
        return 0;
      });
    }

    for (const dishId of shuffled) {
      if (checkHardCrossDay(grid, cell.dayIdx, slotIdx, dishId, hardRules, targetIndices, pool)) {
        grid[cell.dayIdx][slotIdx] = dishId;
        if (bt(idx + 1)) return true;
        grid[cell.dayIdx][slotIdx] = null;
        backtracks++;
        if (backtracks > MAX_BACKTRACK) return false;
      }
    }

    return false;
  }

  const succeeded = bt(0);
  return { grid, succeeded };
}

// ---------- Phase 2: Hill-climbing for soft rules ----------

function scorePlan(
  grid: (string | null)[][],
  targetIndices: number[],
  softRules: CustomRule[],
): number {
  let score = 0;
  let maxScore = 0;

  for (const dIdx of targetIndices) {
    for (let sIdx = 0; sIdx < 3; sIdx++) {
      const slot = SLOTS[sIdx];
      const dishId = grid[dIdx][sIdx];
      if (!dishId) continue;
      const dish = DISHES_BY_ID[dishId];
      if (!dish) continue;

      // Prefer rules
      score += preferenceScore(dish, slot, softRules);
      maxScore += softRules.filter(
        (r) => r.enabled && r.kind === "prefer" && (r.scope === "any" || r.scope === slot),
      ).length;

      // Lighter dinner bonus
      if (sIdx === 2) {
        const lunchId = grid[dIdx][1];
        if (lunchId) {
          const lunchKcal = DISHES_BY_ID[lunchId]?.kcal ?? 600;
          if (dish.kcal <= lunchKcal) {
            score += 1;
          }
        }
        maxScore += 1;
      }
    }

    // No-repeat bonus: check if any dish repeats within ±2 days
    const dayDishes = [grid[dIdx][0], grid[dIdx][1], grid[dIdx][2]].filter(Boolean);
    let noRepeatBonus = 1;
    for (const id of dayDishes) {
      for (let offset = -2; offset <= 2; offset++) {
        if (offset === 0) continue;
        const ni = dIdx + offset;
        if (ni < 0 || ni >= grid.length) continue;
        const neighborDishes = [grid[ni][0], grid[ni][1], grid[ni][2]];
        if (neighborDishes.includes(id)) {
          noRepeatBonus = 0;
          break;
        }
      }
      if (noRepeatBonus === 0) break;
    }
    score += noRepeatBonus;
    maxScore += 1;
  }

  return maxScore > 0 ? Math.round((score / maxScore) * 100) : 100;
}

function hillClimb(
  grid: (string | null)[][],
  targetIndices: number[],
  pool: Record<Slot, Dish[]>,
  hardRules: CustomRule[],
  softRules: CustomRule[],
  passes: number = 3,
): void {
  for (let pass = 0; pass < passes; pass++) {
    let improved = false;
    for (const dIdx of targetIndices) {
      for (let sIdx = 0; sIdx < 3; sIdx++) {
        const slot = SLOTS[sIdx];
        const currentId = grid[dIdx][sIdx];
        const currentScore = scorePlan(grid, targetIndices, softRules);

        // Try each alternative
        const candidates = pool[slot]
          .filter((d) => d.id !== currentId)
          .filter((d) =>
            checkHardCrossDay(grid, dIdx, sIdx, d.id, hardRules, targetIndices, pool),
          );

        let bestId = currentId;
        let bestScore = currentScore;

        for (const candidate of candidates) {
          grid[dIdx][sIdx] = candidate.id;
          const newScore = scorePlan(grid, targetIndices, softRules);
          if (newScore > bestScore) {
            bestScore = newScore;
            bestId = candidate.id;
            improved = true;
          }
        }

        grid[dIdx][sIdx] = bestId;
      }
    }
    if (!improved) break;
  }
}

// ---------- Phase 3: Assemble result ----------

function checkViolations(plan: DayPlan[], rules: CustomRule[]): string[] {
  // ponytail: inline violation check to avoid circular import with rules.ts
  const violated = new Set<string>();
  for (let dayIdx = 0; dayIdx < plan.length; dayIdx++) {
    const day = plan[dayIdx];
    const weekStart = Math.floor(dayIdx / 7) * 7;
    const week = plan.slice(weekStart, weekStart + 7);
    const dayIds = [day.breakfast, day.lunch, day.dinner];

    for (const r of rules) {
      if (!r.enabled) continue;
      const slotsToCheck: Slot[] = r.scope === "any" ? SLOTS : [r.scope as Slot];

      if (r.kind === "avoid") {
        const hasViolating = slotsToCheck.some((s) => {
          const dish = DISHES_BY_ID[day[s]];
          return dish && dishMatches(dish, r.match);
        });
        if (hasViolating) violated.add(r.id);
      } else if (r.kind === "require") {
        if (r.scope === "any") {
          const satisfied = slotsToCheck.some((s) => {
            const dish = DISHES_BY_ID[day[s]];
            return dish && dishMatches(dish, r.match);
          });
          if (!satisfied) violated.add(r.id);
        } else {
          const dish = DISHES_BY_ID[day[r.scope as Slot]];
          if (!dish || !dishMatches(dish, r.match)) violated.add(r.id);
        }
      } else if (r.kind === "max-frequency" || r.kind === "min-frequency") {
        let count = 0;
        week.forEach((d) => {
          slotsToCheck.forEach((s) => {
            const dish = DISHES_BY_ID[d[s]];
            if (dish && dishMatches(dish, r.match)) count++;
          });
        });
        const limit = r.match.frequencyLimit ?? 1;
        if (r.kind === "max-frequency" && count > limit) violated.add(r.id);
        if (r.kind === "min-frequency" && count < limit) violated.add(r.id);
      } else if (r.kind === "no-repeat") {
        const days = r.match.minDaysBetweenRepeat ?? 3;
        const window = plan.slice(Math.max(0, dayIdx - days), Math.min(plan.length, dayIdx + days + 1));
        const windowIds = window.flatMap((d) => [d.breakfast, d.lunch, d.dinner]);
        if (!dayIds.every((id) => windowIds.filter((x) => x === id).length <= 1)) {
          violated.add(r.id);
        }
      } else if (r.kind === "lighter-dinner") {
        const dinnerKcal = DISHES_BY_ID[day.dinner]?.kcal ?? 0;
        const lunchKcal = DISHES_BY_ID[day.lunch]?.kcal ?? 0;
        const maxDiff = r.match.maxKcalDifference ?? 0;
        if (dinnerKcal > lunchKcal + maxDiff) violated.add(r.id);
      }
    }
  }
  return Array.from(violated);
}

/**
 * Constraint-solving plan generator. Replaces the old greedy shuffler.
 *
 * Uses backtracking with MRV heuristic for hard constraints,
 * then hill-climbing for soft constraints (prefer, lighter-dinner, no-repeat).
 * Returns the plan + metadata about what was relaxed.
 */
export function generateShuffledPlan(
  currentPlan: DayPlan[],
  range: "7days" | "full" | "42days",
  startDayIdx: number,
  customRules: CustomRule[],
): DayPlan[] {
  const result = generateSolvedPlan(currentPlan, range, startDayIdx, customRules);
  return result.plan;
}

export function generateSolvedPlan(
  currentPlan: DayPlan[],
  range: "7days" | "full" | "42days",
  startDayIdx: number,
  customRules: CustomRule[],
): SolverResult {
  const cycleLen = currentPlan.length || 42;
  const targetIndices: number[] =
    range === "7days"
      ? Array.from({ length: 7 }, (_, i) => (startDayIdx + i) % cycleLen)
      : Array.from({ length: cycleLen }, (_, i) => i);

  const enabledRules = customRules.filter((r) => r.enabled);
  const hardRules = enabledRules.filter((r) => classifyRule(r) === "hard");
  const softRules = enabledRules.filter((r) => classifyRule(r) === "soft");

  // Build pool filtered by per-dish hard rules (avoid/require)
  const pool = buildPool(hardRules);

  // Check feasibility and progressively relax infeasible require rules
  const relaxed: string[] = [];
  let feasibility = checkFeasibility(hardRules, DISHES);
  if (!feasibility.feasible) {
    // Relax impossible rules by removing them from hard rules
    for (const id of feasibility.impossible) {
      relaxed.push(id);
    }
  }

  const activeHardRules = hardRules.filter((r) => !relaxed.includes(r.id));

  // Rebuild pool with relaxed rules
  const activePool = relaxed.length > 0 ? buildPool(activeHardRules) : pool;

  // Phase 1: Backtracking solve
  let { grid, succeeded } = solve(targetIndices, activePool, activeHardRules, currentPlan);

  // If backtracking failed, relax cross-day rules progressively
  if (!succeeded) {
    // Try relaxing no-repeat first
    const noRepeatRules = activeHardRules.filter((r) => r.kind === "no-repeat");
    if (noRepeatRules.length > 0) {
      const withoutNoRepeat = activeHardRules.filter((r) => r.kind !== "no-repeat");
      noRepeatRules.forEach((r) => relaxed.push(r.id));
      ({ grid, succeeded } = solve(targetIndices, activePool, withoutNoRepeat, currentPlan));
    }

    // If still failing, relax frequency limits
    if (!succeeded) {
      const freqRules = activeHardRules.filter((r) => r.kind === "max-frequency");
      const withoutFreq = activeHardRules.filter(
        (r) => r.kind !== "no-repeat" && r.kind !== "max-frequency",
      );
      freqRules.forEach((r) => relaxed.push(r.id));
      ({ grid, succeeded } = solve(targetIndices, activePool, withoutFreq, currentPlan));
    }

    // Last resort: just per-dish rules only
    if (!succeeded) {
      const perDishOnly = activeHardRules.filter(
        (r) => r.kind === "avoid" || r.kind === "require",
      );
      activeHardRules
        .filter((r) => r.kind !== "avoid" && r.kind !== "require")
        .forEach((r) => { if (!relaxed.includes(r.id)) relaxed.push(r.id); });
      ({ grid, succeeded } = solve(targetIndices, activePool, perDishOnly, currentPlan));
    }
  }

  // Phase 2: Hill-climbing for soft rules
  if (succeeded && softRules.length > 0) {
    hillClimb(grid, targetIndices, activePool, activeHardRules, softRules);
  }

  // Convert grid back to DayPlan[]
  const plan: DayPlan[] = currentPlan.map((day, i) => {
    if (!targetIndices.includes(i)) return { ...day };
    return {
      day: i,
      breakfast: grid[i][0] ?? day.breakfast,
      lunch: grid[i][1] ?? day.lunch,
      dinner: grid[i][2] ?? day.dinner,
    };
  });

  // Phase 3: Check remaining violations
  const violations = checkViolations(plan, enabledRules);
  const score = scorePlan(grid, targetIndices, softRules);

  return {
    plan,
    relaxed: [...new Set(relaxed)],
    violations: violations.filter((v) => !relaxed.includes(v)),
    score: succeeded ? score : 0,
  };
}
