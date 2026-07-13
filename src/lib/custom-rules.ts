import { useCallback, useEffect, useState } from "react";
import type { Cuisine, CookingType, Equipment, Dish, DishTag, Slot } from "./dishes";
import { supabase } from "./supabase";

export type RuleKind = "avoid" | "prefer" | "require" | "min-frequency" | "max-frequency";
export type RuleScope = "any" | "breakfast" | "lunch" | "dinner";

export interface RuleMatch {
  cuisine?: Cuisine;
  cookingType?: CookingType;
  equipment?: Equipment;
  tag?: DishTag;
  maxPrepMinutes?: number;
  maxSpice?: 0 | 1 | 2 | 3;
  frequencyLimit?: number; // frequency limit for min/max frequency rules (times per week)
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
    return JSON.parse(raw) as CustomRule[];
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
  if (m.maxPrepMinutes !== undefined && (dish.prepMinutes ?? 30) > m.maxPrepMinutes) return false;
  if (m.maxSpice !== undefined && (dish.spiceLevel ?? 1) > m.maxSpice) return false;
  return true;
}

/** True when the dish is permitted in this slot by all "require"/"avoid" rules. */
export function passesRules(dish: Dish, slot: Slot, rules: CustomRule[]): boolean {
  for (const r of rules) {
    if (!r.enabled) continue;
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

export const RULE_FIELD_OPTIONS = {
  cuisine: ["north-indian", "south-indian", "gujarati", "punjabi", "bengali", "maharashtrian", "indo-chinese", "continental"] as Cuisine[],
  cookingType: ["stovetop", "no-cook", "steamed", "baked", "fried", "grilled", "instant-pot"] as CookingType[],
  equipment: ["stove", "oven", "airfryer", "microwave", "blender", "pressure-cooker", "griddle"] as Equipment[],
  tag: ["pizza", "paratha", "fried-breakfast", "dal", "legume", "leafy", "sweet", "light"] as DishTag[],
};