import { DISHES, dishesForSlot, type Slot } from "./dishes";

export interface DayPlan {
  day: number;
  breakfast: string;
  lunch: string;
  dinner: string;
}

export const BASE_PLAN: DayPlan[] = buildBasePlan();

function buildBasePlan(): DayPlan[] {
  const breakfastPool = dishesForSlot("breakfast").filter((d) => !d.tags.includes("fried-breakfast"));
  const friedBreakfast = dishesForSlot("breakfast").filter((d) => d.tags.includes("fried-breakfast"));
  const lunchPool = dishesForSlot("lunch");
  const dinnerPool = dishesForSlot("dinner").sort((a, b) => a.kcal - b.kcal);

  const days: DayPlan[] = [];
  for (let i = 0; i < 42; i++) {
    let breakfast = breakfastPool[i % breakfastPool.length].id;
    if (i % 7 === 6 && friedBreakfast.length > 0) {
      breakfast = friedBreakfast[Math.floor(i / 7) % friedBreakfast.length].id;
    }
    const lunchDish = lunchPool[(i * 3) % lunchPool.length];
    const dinnerCandidates = dinnerPool.filter((d) => d.kcal <= lunchDish.kcal);
    const dinnerDish = dinnerCandidates[i % dinnerCandidates.length] ?? dinnerPool[0];
    days.push({ day: i, breakfast, lunch: lunchDish.id, dinner: dinnerDish.id });
  }
  return days;
}

export function slotOfPlan(day: DayPlan, slot: Slot): string {
  return slot === "breakfast" ? day.breakfast : slot === "lunch" ? day.lunch : day.dinner;
}

export const TOTAL_DISHES = DISHES.length;