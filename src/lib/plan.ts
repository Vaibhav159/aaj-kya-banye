import { DISHES, type Slot } from "./dishes";

export interface DayPlan {
  day: number;
  breakfast: string;
  lunch: string;
  dinner: string;
}

export const BASE_PLAN: DayPlan[] = [
  { day: 0, breakfast: "b6", lunch: "l19", dinner: "d22" },
  { day: 1, breakfast: "b3", lunch: "l28", dinner: "d32" },
  { day: 2, breakfast: "b5", lunch: "l2", dinner: "d29" },
  { day: 3, breakfast: "b1", lunch: "l27", dinner: "d20" },
  { day: 4, breakfast: "b2", lunch: "l18", dinner: "d10" },
  { day: 5, breakfast: "b4", lunch: "l3", dinner: "d31" },
  { day: 6, breakfast: "b6", lunch: "l7", dinner: "d7" },
  { day: 7, breakfast: "b1", lunch: "l12", dinner: "d26" },
  { day: 8, breakfast: "b3", lunch: "l16", dinner: "d14" },
  { day: 9, breakfast: "b5", lunch: "l31", dinner: "l20" },
  { day: 10, breakfast: "b2", lunch: "l5", dinner: "d23" },
  { day: 11, breakfast: "b6", lunch: "l1", dinner: "d33" },
  { day: 12, breakfast: "b4", lunch: "l11", dinner: "d1" },
  { day: 13, breakfast: "b1", lunch: "l8", dinner: "d11" },
  { day: 14, breakfast: "b6", lunch: "l13", dinner: "d24" },
  { day: 15, breakfast: "b3", lunch: "l23", dinner: "d29" },
  { day: 16, breakfast: "b5", lunch: "l9", dinner: "d5" },
  { day: 17, breakfast: "b1", lunch: "l29", dinner: "d19" },
  { day: 18, breakfast: "b2", lunch: "l17", dinner: "d35" },
  { day: 19, breakfast: "b4", lunch: "l26", dinner: "d6" },
  { day: 20, breakfast: "b6", lunch: "l24", dinner: "d7" },
  { day: 21, breakfast: "b1", lunch: "l19", dinner: "d27" },
  { day: 22, breakfast: "b3", lunch: "l6", dinner: "d30" },
  { day: 23, breakfast: "b5", lunch: "l20", dinner: "d12" },
  { day: 24, breakfast: "b2", lunch: "l15", dinner: "d25" },
  { day: 25, breakfast: "b6", lunch: "l12", dinner: "d18" },
  { day: 26, breakfast: "b4", lunch: "l32", dinner: "d2" },
  { day: 27, breakfast: "b1", lunch: "l27", dinner: "d16" },
  { day: 28, breakfast: "b6", lunch: "l28", dinner: "d21" },
  { day: 29, breakfast: "b3", lunch: "l18", dinner: "d29" },
  { day: 30, breakfast: "b5", lunch: "l4", dinner: "d9" },
  { day: 31, breakfast: "b1", lunch: "l25", dinner: "d28" },
  { day: 32, breakfast: "b2", lunch: "l21", dinner: "d4" },
  { day: 33, breakfast: "b4", lunch: "l30", dinner: "d17" },
  { day: 34, breakfast: "b6", lunch: "l8", dinner: "d7" },
  { day: 35, breakfast: "b1", lunch: "l14", dinner: "d20" },
  { day: 36, breakfast: "b3", lunch: "l27", dinner: "d34" },
  { day: 37, breakfast: "b5", lunch: "l3", dinner: "d13" },
  { day: 38, breakfast: "b2", lunch: "l22", dinner: "d22" },
  { day: 39, breakfast: "b6", lunch: "l10", dinner: "d15" },
  { day: 40, breakfast: "b4", lunch: "l32", dinner: "d3" },
  { day: 41, breakfast: "b1", lunch: "l6", dinner: "d8" }
];

export function slotOfPlan(day: DayPlan, slot: Slot): string {
  return slot === "breakfast" ? day.breakfast : slot === "lunch" ? day.lunch : day.dinner;
}

export const TOTAL_DISHES = DISHES.length;
