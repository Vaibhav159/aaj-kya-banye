import { DISHES_BY_ID, CATEGORY_EMOJI, type Ingredient, type IngredientCategory } from "./dishes";
import type { DayPlan } from "./plan";

export interface AggregatedIngredient {
  name: string;
  unit: Ingredient["unit"];
  qty: number;
  category: IngredientCategory;
}

const CATS: IngredientCategory[] = ["veg", "grain", "dairy", "legume", "spice", "oil", "fruit", "nut", "other"];

export function aggregateGrocery(plan: DayPlan[]): Record<IngredientCategory, AggregatedIngredient[]> {
  const map = new Map<string, AggregatedIngredient>();
  for (const day of plan) {
    for (const dishId of [day.breakfast, day.lunch, day.dinner]) {
      const dish = DISHES_BY_ID[dishId];
      if (!dish) continue;
      for (const ing of dish.ingredients) {
        const key = `${ing.name}|${ing.unit}`;
        const existing = map.get(key);
        if (existing) existing.qty += ing.qty;
        else map.set(key, { ...ing });
      }
    }
  }
  const grouped = Object.fromEntries(CATS.map((c) => [c, [] as AggregatedIngredient[]])) as Record<IngredientCategory, AggregatedIngredient[]>;
  for (const item of map.values()) grouped[item.category].push(item);
  for (const cat of CATS) grouped[cat].sort((a, b) => a.name.localeCompare(b.name));
  return grouped;
}

export function toCopyText(grouped: Record<IngredientCategory, AggregatedIngredient[]>): string {
  const lines: string[] = ["Thali grocery list", ""];
  for (const cat of CATS) {
    const items = grouped[cat];
    if (!items.length) continue;
    lines.push(`${CATEGORY_EMOJI[cat]} ${cat.toUpperCase()}`);
    for (const it of items) lines.push(`  - ${it.name}: ${it.qty}${it.unit}`);
    lines.push("");
  }
  return lines.join("\n");
}