import { useCallback, useEffect, useState } from "react";
import type { Cuisine, CookingType, Equipment, Dish, DishTag, Slot } from "./dishes";
import { supabase } from "./supabase";

export type RuleKind = "avoid" | "prefer" | "require" | "min-frequency" | "max-frequency" | "no-repeat" | "lighter-dinner";
export type RuleScope = "any" | "breakfast" | "lunch" | "dinner";

export interface RuleMatch {
  cuisine?: Cuisine;
  cookingType?: CookingType;
  equipment?: Equipment;
  tag?: DishTag;
  tags?: DishTag[]; // Match any of these tags
  maxPrepMinutes?: number;
  maxSpice?: 0 | 1 | 2 | 3;
  frequencyLimit?: number; // frequency limit for min/max frequency rules (times per week)
  minProtein?: number;
  maxCarbs?: number;
  maxKcal?: number;
  minDaysBetweenRepeat?: number;
  maxKcalDifference?: number;
}

export interface CustomRule {
  id: string;
  label: string;
  kind: RuleKind;
  scope: RuleScope;
  match: RuleMatch;
  enabled: boolean;
}

const KEY = "thali:customRules";

export const EXAMPLE_RULES: CustomRule[] = [
  // Migrated from built-in Rule Tracker (all enabled by default)
  { id: "r-pizza-weekly", label: "Pizza · max 1×/week", kind: "max-frequency", scope: "any", match: { tag: "pizza", frequencyLimit: 1 }, enabled: true },
  { id: "r-paratha-slot", label: "Paratha only breakfast or lunch", kind: "avoid", scope: "dinner", match: { tag: "paratha" }, enabled: true },
  { id: "r-fried-breakfast", label: "Fried breakfasts · max 2×/week", kind: "max-frequency", scope: "breakfast", match: { tag: "fried-breakfast", frequencyLimit: 2 }, enabled: false },
  { id: "r-dal-daily", label: "Dal or legume every day", kind: "require", scope: "any", match: { tags: ["dal", "legume"] }, enabled: true },
  { id: "r-leafy-daily", label: "Leafy greens every day", kind: "require", scope: "any", match: { tag: "leafy" }, enabled: true },
  { id: "r-no-repeat-3", label: "No repeat within 3 days", kind: "no-repeat", scope: "any", match: { minDaysBetweenRepeat: 3 }, enabled: true },
  { id: "r-lighter-dinner", label: "Dinner lighter than lunch", kind: "lighter-dinner", scope: "dinner", match: { maxKcalDifference: 0 }, enabled: true },
  { id: "r-sweets-weekly", label: "Sweets · max 2×/week", kind: "max-frequency", scope: "any", match: { tag: "sweet", frequencyLimit: 2 }, enabled: false },

  // New prebuilt rules (disabled by default)
  { id: "r-protein-paglu", label: "Protein Paglu · Min 20g protein", kind: "require", scope: "any", match: { minProtein: 20 }, enabled: false },
  { id: "r-light-dinner-kcal", label: "Light Dinner · Max 450 kcal", kind: "require", scope: "dinner", match: { maxKcal: 450 }, enabled: false },
  { id: "r-low-carb", label: "Low Carb · Max 50g carbs", kind: "prefer", scope: "any", match: { maxCarbs: 50 }, enabled: false },

  // Original custom rules examples
  { id: "r-airfryer-dinner", label: "Airfryer-only dinners", kind: "require", scope: "dinner", match: { equipment: "airfryer" }, enabled: false },
  { id: "r-no-fried", label: "No fried food at dinner", kind: "avoid", scope: "dinner", match: { cookingType: "fried" }, enabled: false },
  { id: "r-quick-weekday", label: "Prefer quick meals (≤ 20 min)", kind: "prefer", scope: "any", match: { maxPrepMinutes: 20 }, enabled: false },
  { id: "r-mild-spice", label: "Mild spice only", kind: "require", scope: "any", match: { maxSpice: 1 }, enabled: false },
];

function read(): CustomRule[] {
  if (typeof window === "undefined") return EXAMPLE_RULES;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return EXAMPLE_RULES;
    const stored = JSON.parse(raw) as CustomRule[];
    const hasMigrated = stored.some(r => r.id === "r-pizza-weekly" || r.id.startsWith("r-"));
    if (!hasMigrated) {
      const missing = EXAMPLE_RULES.filter(er => !stored.some(sr => sr.id === er.id));
      if (missing.length > 0) {
        return [...missing, ...stored];
      }
    }
    return stored;
  } catch {
    return EXAMPLE_RULES;
  }
}

async function syncCustomRule(rule: CustomRule, isDeleted: boolean = false) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isDeleted) {
      await supabase.from("custom_rules").delete().eq("user_id", user.id).eq("id", rule.id);
    } else {
      await supabase.from("custom_rules").upsert({
        id: rule.id,
        user_id: user.id,
        label: rule.label,
        kind: rule.kind,
        scope: rule.scope,
        match: rule.match,
        enabled: rule.enabled,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Custom rule sync error:", err);
  }
}

export function useCustomRules() {
  const [rules, setRules] = useState<CustomRule[]>(EXAMPLE_RULES);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(() => {
    setRules(read());
    setHydrated(true);
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      window.addEventListener("thali:sync", load);
      return () => window.removeEventListener("thali:sync", load);
    }
  }, [load]);

  const persist = (next: CustomRule[]) => {
    setRules(next);
    if (typeof window !== "undefined") window.localStorage.setItem(KEY, JSON.stringify(next));
  };

  const add = useCallback((r: Omit<CustomRule, "id">) => {
    const id = `r-${Date.now().toString(36)}`;
    const rule = { ...r, id };
    const next = [...read(), rule];
    persist(next);
    syncCustomRule(rule);
  }, []);

  const update = useCallback((id: string, patch: Partial<CustomRule>) => {
    const next = read().map((r) => (r.id === id ? { ...r, ...patch } : r));
    persist(next);
    const updated = next.find(r => r.id === id);
    if (updated) syncCustomRule(updated);
  }, []);

  const remove = useCallback((id: string) => {
    const target = read().find(r => r.id === id);
    if (target) syncCustomRule(target, true);
    persist(read().filter((r) => r.id !== id));
  }, []);

  const toggle = useCallback((id: string) => {
    const next = read().map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r));
    persist(next);
    const updated = next.find(r => r.id === id);
    if (updated) syncCustomRule(updated);
  }, []);

  return { rules, hydrated, add, update, remove, toggle };
}

/** Does the dish satisfy this match block? */
export function dishMatches(dish: Dish, m: RuleMatch): boolean {
  if (m.cuisine && dish.cuisine !== m.cuisine) return false;
  if (m.cookingType && dish.cookingType !== m.cookingType) return false;
  if (m.equipment && !(dish.equipment ?? []).includes(m.equipment)) return false;
  if (m.tag && !dish.tags.includes(m.tag)) return false;
  if (m.tags && !m.tags.some(t => dish.tags.includes(t))) return false;
  if (m.maxPrepMinutes !== undefined && (dish.prepMinutes ?? 30) > m.maxPrepMinutes) return false;
  if (m.maxSpice !== undefined && (dish.spiceLevel ?? 1) > m.maxSpice) return false;
  if (m.minProtein !== undefined && (dish.protein ?? 0) < m.minProtein) return false;
  if (m.maxCarbs !== undefined && (dish.carbs ?? 0) > m.maxCarbs) return false;
  if (m.maxKcal !== undefined && (dish.kcal ?? 0) > m.maxKcal) return false;
  return true;
}

/** True when the dish is permitted in this slot by all "require"/"avoid" rules. */
export function passesRules(dish: Dish, slot: Slot, rules: CustomRule[]): boolean {
  for (const r of rules) {
    if (!r.enabled) continue;
    if (r.kind === "require" && r.scope === "any") continue;
    if (r.scope !== "any" && r.scope !== slot) continue;
    const matches = dishMatches(dish, r.match);
    if (r.kind === "require" && !matches) return false;
    if (r.kind === "avoid" && matches) return false;
  }
  return true;
}

/** Positive score = preferred, 0 = neutral. */
export function preferenceScore(dish: Dish, slot: Slot, rules: CustomRule[]): number {
  let s = 0;
  for (const r of rules) {
    if (!r.enabled || r.kind !== "prefer") continue;
    if (r.scope !== "any" && r.scope !== slot) continue;
    if (dishMatches(dish, r.match)) s += 1;
  }
  return s;
}

/** Hard = must-satisfy during generation. Soft = optimize-after.
 * ponytail: require/avoid are non-negotiable. Tight frequency caps (≤2) are hard
 * because violating them is obvious. Everything else is soft and gets hill-climbed. */
export function classifyRule(r: CustomRule): "hard" | "soft" {
  if (r.kind === "avoid" || r.kind === "require") return "hard";
  if (r.kind === "max-frequency" && (r.match.frequencyLimit ?? 1) <= 2) return "hard";
  return "soft";
}

/** Quick check: can the dish pool satisfy all hard require rules for a given slot?
 * Returns rule IDs that are impossible to satisfy. */
export function checkFeasibility(
  rules: CustomRule[],
  pool: import("./dishes").Dish[],
): { feasible: boolean; impossible: string[] } {
  const impossible: string[] = [];
  for (const r of rules) {
    if (!r.enabled || r.kind !== "require") continue;
    if (r.scope === "any") {
      const matching = pool.filter((d) => dishMatches(d, r.match));
      if (matching.length === 0) {
        impossible.push(r.id);
      }
    } else {
      const matching = pool.filter(
        (d) => d.slots.includes(r.scope as import("./dishes").Slot) && dishMatches(d, r.match),
      );
      if (matching.length === 0) {
        impossible.push(r.id);
      }
    }
  }
  return { feasible: impossible.length === 0, impossible };
}

/** Count how many dishes in pool match a rule's match criteria for a given slot. */
export function countMatchingDishes(
  match: RuleMatch,
  slot: import("./dishes").Slot | "any",
  pool: import("./dishes").Dish[],
): number {
  return pool.filter((d) => {
    if (slot !== "any" && !d.slots.includes(slot)) return false;
    return dishMatches(d, match);
  }).length;
}

export const RULE_FIELD_OPTIONS = {
  cuisine: ["north-indian", "south-indian", "gujarati", "punjabi", "bengali", "maharashtrian", "indo-chinese", "continental"] as Cuisine[],
  cookingType: ["stovetop", "no-cook", "steamed", "baked", "fried", "grilled", "instant-pot"] as CookingType[],
  equipment: ["stove", "oven", "airfryer", "microwave", "blender", "pressure-cooker", "griddle"] as Equipment[],
  tag: ["pizza", "paratha", "fried-breakfast", "dal", "legume", "leafy", "sweet", "light"] as DishTag[],
};