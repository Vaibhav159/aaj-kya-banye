import { useCallback, useEffect, useState } from "react";
import { BASE_PLAN, type DayPlan } from "./plan";
import type { Dish, Slot, DishTag, Cuisine, CookingType, Equipment } from "./dishes";
import { supabase } from "./supabase";
import { type CustomRule, type RuleKind, type RuleScope, type RuleMatch, EXAMPLE_RULES } from "./custom-rules";

export type CustomDish = Dish & { custom: true };

export interface Profile {
  name: string;
  weightKg: number;
  targetKg: number;
  goalKcal: number;
  goalProtein: number;
  goalCarbs: number;
  goalFat: number;
  breakfastTime: string; // "HH:MM"
  lunchTime: string;
  dinnerTime: string;
}

export const DEFAULT_PROFILE: Profile = {
  name: "You",
  weightKg: 70,
  targetKg: 68,
  goalKcal: 2000,
  goalProtein: 80,
  goalCarbs: 250,
  goalFat: 65,
  breakfastTime: "08:00",
  lunchTime: "13:00",
  dinnerTime: "20:00",
};

const PROFILE_KEY = "thali:profile";
const CYCLE_KEY = "thali:cycleStart";
const OVERRIDES_KEY = "thali:overrides";
const LOG_KEY = "thali:log";
const CUSTOM_DISHES_KEY = "thali:customDishes";

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

// ---------- Supabase Sync helpers ----------
async function syncProfile(profile: Profile) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("profiles").upsert({
      id: user.id,
      name: profile.name,
      weight_kg: profile.weightKg,
      target_kg: profile.targetKg,
      goal_kcal: profile.goalKcal,
      goal_protein: profile.goalProtein,
      goal_carbs: profile.goalCarbs,
      goal_fat: profile.goalFat,
      breakfast_time: profile.breakfastTime,
      lunch_time: profile.lunchTime,
      dinner_time: profile.dinnerTime,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Profile sync error:", err);
  }
}

async function syncCycleStart(startTime: number) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("cycle_starts").upsert({
      id: user.id,
      start_time: startTime,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Cycle start sync error:", err);
  }
}

async function syncOverride(key: string, dishId: string) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("overrides").upsert({
      user_id: user.id,
      key,
      dish_id: dishId,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Override sync error:", err);
  }
}

async function syncMealLog(key: string, entry: LogEntry | null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (entry === null) {
      await supabase.from("meal_logs").delete().eq("user_id", user.id).eq("key", key);
    } else {
      await supabase.from("meal_logs").upsert({
        user_id: user.id,
        key,
        status: entry.status,
        logged_at: entry.at,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Meal log sync error:", err);
  }
}

async function syncCustomDish(dish: CustomDish, isDeleted: boolean = false) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    if (isDeleted) {
      await supabase.from("custom_dishes").delete().eq("user_id", user.id).eq("id", dish.id);
    } else {
      await supabase.from("custom_dishes").upsert({
        id: dish.id,
        user_id: user.id,
        name: dish.name,
        emoji: dish.emoji,
        slots: dish.slots,
        kcal: dish.kcal,
        protein: dish.protein,
        carbs: dish.carbs,
        fat: dish.fat,
        tags: dish.tags,
        ingredients: dish.ingredients,
        cuisine: dish.cuisine,
        cooking_type: dish.cookingType,
        equipment: dish.equipment,
        prep_minutes: dish.prepMinutes,
        spice_level: dish.spiceLevel,
        recipe_url: dish.recipeUrl,
        updated_at: new Date().toISOString(),
      });
    }
  } catch (err) {
    console.error("Custom dish sync error:", err);
  }
}

export async function syncAllData() {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // 1. Sync Profile
    const { data: remoteProfile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (profileError) {
      throw new Error(`Profiles table error: ${profileError.message}`);
    }

    if (remoteProfile) {
      const mergedProfile: Profile = {
        name: remoteProfile.name,
        weightKg: Number(remoteProfile.weight_kg),
        targetKg: Number(remoteProfile.target_kg),
        goalKcal: remoteProfile.goal_kcal,
        goalProtein: remoteProfile.goal_protein,
        goalCarbs: remoteProfile.goal_carbs,
        goalFat: remoteProfile.goal_fat,
        breakfastTime: remoteProfile.breakfast_time,
        lunchTime: remoteProfile.lunch_time,
        dinnerTime: remoteProfile.dinner_time,
      };
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(mergedProfile));
    } else {
      const localProfile = readLS<Partial<Profile>>(PROFILE_KEY, {});
      await syncProfile({ ...DEFAULT_PROFILE, ...localProfile });
    }

    // 2. Sync Cycle Start
    const { data: remoteCycle, error: cycleError } = await supabase
      .from("cycle_starts")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    if (cycleError) {
      throw new Error(`Cycle starts table error: ${cycleError.message}`);
    }

    if (remoteCycle) {
      window.localStorage.setItem(CYCLE_KEY, JSON.stringify(remoteCycle.start_time));
    } else {
      const localCycle = readLS<number | null>(CYCLE_KEY, null);
      if (localCycle) await syncCycleStart(localCycle);
    }

    // 3. Sync Overrides
    const { data: remoteOverrides, error: overridesError } = await supabase
      .from("overrides")
      .select("*")
      .eq("user_id", user.id);

    if (overridesError) {
      throw new Error(`Overrides table error: ${overridesError.message}`);
    }

    if (remoteOverrides && remoteOverrides.length > 0) {
      const localOverrides = readLS<Overrides>(OVERRIDES_KEY, {});
      const mergedOverrides = { ...localOverrides };
      remoteOverrides.forEach((row) => {
        mergedOverrides[row.key] = row.dish_id;
      });
      window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(mergedOverrides));
      
      for (const [k, v] of Object.entries(localOverrides)) {
        if (!remoteOverrides.some(r => r.key === k)) {
          await syncOverride(k, v);
        }
      }
    } else {
      const localOverrides = readLS<Overrides>(OVERRIDES_KEY, {});
      for (const [k, v] of Object.entries(localOverrides)) {
        await syncOverride(k, v);
      }
    }

    // 4. Sync Meal Logs
    const { data: remoteLogs, error: logsError } = await supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id);

    if (logsError) {
      throw new Error(`Meal logs table error: ${logsError.message}`);
    }

    if (remoteLogs && remoteLogs.length > 0) {
      const localLogs = readLS<MealLog>(LOG_KEY, {});
      const mergedLogs = { ...localLogs };
      remoteLogs.forEach((row) => {
        const localEntry = localLogs[row.key];
        if (!localEntry || row.logged_at > localEntry.at) {
          mergedLogs[row.key] = { status: row.status as LogStatus, at: Number(row.logged_at) };
        }
      });
      window.localStorage.setItem(LOG_KEY, JSON.stringify(mergedLogs));

      for (const [k, v] of Object.entries(localLogs)) {
        const match = remoteLogs.find(r => r.key === k);
        if (!match || v.at > Number(match.logged_at)) {
          await syncMealLog(k, v);
        }
      }
    } else {
      const localLogs = readLS<MealLog>(LOG_KEY, {});
      for (const [k, v] of Object.entries(localLogs)) {
        await syncMealLog(k, v);
      }
    }

    // 5. Sync Custom Dishes
    const { data: remoteCustomDishes, error: customDishesError } = await supabase
      .from("custom_dishes")
      .select("*")
      .eq("user_id", user.id);

    if (customDishesError) {
      throw new Error(`Custom dishes table error: ${customDishesError.message}`);
    }

    if (remoteCustomDishes && remoteCustomDishes.length > 0) {
      const localCustomDishes = readLS<CustomDish[]>(CUSTOM_DISHES_KEY, []);
      const mergedDishes = [...localCustomDishes];
      remoteCustomDishes.forEach((row) => {
        const idx = mergedDishes.findIndex(d => d.id === row.id);
        const mappedDish: CustomDish = {
          id: row.id,
          name: row.name,
          emoji: row.emoji,
          slots: row.slots as Slot[],
          kcal: row.kcal,
          protein: row.protein,
          carbs: row.carbs,
          fat: row.fat,
          tags: row.tags as DishTag[],
          ingredients: row.ingredients,
          cuisine: row.cuisine as Cuisine,
          cookingType: row.cooking_type as CookingType,
          equipment: row.equipment as Equipment[],
          prepMinutes: row.prep_minutes,
          spiceLevel: row.spice_level as 0 | 1 | 2 | 3,
          recipeUrl: row.recipe_url,
          custom: true,
        };
        if (idx > -1) {
          mergedDishes[idx] = mappedDish;
        } else {
          mergedDishes.push(mappedDish);
        }
      });
      window.localStorage.setItem(CUSTOM_DISHES_KEY, JSON.stringify(mergedDishes));

      for (const d of localCustomDishes) {
        if (!remoteCustomDishes.some(r => r.id === d.id)) {
          await syncCustomDish(d);
        }
      }
    } else {
      const localCustomDishes = readLS<CustomDish[]>(CUSTOM_DISHES_KEY, []);
      for (const d of localCustomDishes) {
        await syncCustomDish(d);
      }
    }

    // 6. Sync Custom Rules
    const { data: remoteCustomRules, error: customRulesError } = await supabase
      .from("custom_rules")
      .select("*")
      .eq("user_id", user.id);

    if (customRulesError) {
      throw new Error(`Custom rules table error: ${customRulesError.message}`);
    }

    if (remoteCustomRules && remoteCustomRules.length > 0) {
      const localRules = readLS<CustomRule[]>("thali:customRules", EXAMPLE_RULES);
      const mergedRules = [...localRules];
      remoteCustomRules.forEach((row) => {
        const idx = mergedRules.findIndex(r => r.id === row.id);
        const mappedRule: CustomRule = {
          id: row.id,
          label: row.label,
          kind: row.kind as RuleKind,
          scope: row.scope as RuleScope,
          match: row.match as RuleMatch,
          enabled: row.enabled,
        };
        if (idx > -1) {
          mergedRules[idx] = mappedRule;
        } else {
          mergedRules.push(mappedRule);
        }
      });
      window.localStorage.setItem("thali:customRules", JSON.stringify(mergedRules));

      for (const r of localRules) {
        if (!remoteCustomRules.some(remote => remote.id === r.id)) {
          await supabase.from("custom_rules").upsert({
            id: r.id,
            user_id: user.id,
            label: r.label,
            kind: r.kind,
            scope: r.scope,
            match: r.match,
            enabled: r.enabled,
            updated_at: new Date().toISOString(),
          });
        }
      }
    } else {
      const localRules = readLS<CustomRule[]>("thali:customRules", EXAMPLE_RULES);
      for (const r of localRules) {
        await supabase.from("custom_rules").upsert({
          id: r.id,
          user_id: user.id,
          label: r.label,
          kind: r.kind,
          scope: r.scope,
          match: r.match,
          enabled: r.enabled,
          updated_at: new Date().toISOString(),
        });
      }
    }

    window.dispatchEvent(new Event("thali:sync"));
  } catch (err) {
    console.error("Global sync failed:", err);
    throw err;
  }
}

// ---------- Hook Definitions ----------

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(() => {
    setProfile({ ...DEFAULT_PROFILE, ...readLS<Partial<Profile>>(PROFILE_KEY, {}) });
    setHydrated(true);
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      window.addEventListener("thali:sync", load);
      return () => window.removeEventListener("thali:sync", load);
    }
  }, [load]);

  const save = useCallback((next: Profile) => {
    setProfile(next);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    }
    // Fire-and-forget sync update to Supabase
    syncProfile(next);
  }, []);

  return { profile, save, hydrated };
}

export function useCycleStart() {
  const [start, setStart] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(() => {
    const stored = readLS<number | null>(CYCLE_KEY, null);
    if (stored) {
      setStart(stored);
    } else {
      const now = Date.now();
      if (typeof window !== "undefined") window.localStorage.setItem(CYCLE_KEY, JSON.stringify(now));
      setStart(now);
      syncCycleStart(now);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      window.addEventListener("thali:sync", load);
      return () => window.removeEventListener("thali:sync", load);
    }
  }, [load]);

  const reset = useCallback(() => {
    const now = Date.now();
    if (typeof window !== "undefined") window.localStorage.setItem(CYCLE_KEY, JSON.stringify(now));
    setStart(now);
    syncCycleStart(now);
  }, []);

  return { start, reset, hydrated };
}

export type Overrides = Record<string, string>;

export function overrideKey(dayIdx: number, slot: Slot) {
  return `d${dayIdx}-${slot}`;
}

export function useOverrides() {
  const [overrides, setOverrides] = useState<Overrides>({});
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(() => {
    setOverrides(readLS<Overrides>(OVERRIDES_KEY, {}));
    setHydrated(true);
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      window.addEventListener("thali:sync", load);
      return () => window.removeEventListener("thali:sync", load);
    }
  }, [load]);

  const setOne = useCallback((dayIdx: number, slot: Slot, dishId: string) => {
    const key = overrideKey(dayIdx, slot);
    setOverrides((prev) => {
      const next = { ...prev, [key]: dishId };
      if (typeof window !== "undefined") window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
    syncOverride(key, dishId);
  }, []);

  const setMany = useCallback((newOverrides: Overrides) => {
    setOverrides((prev) => {
      const next = { ...prev, ...newOverrides };
      if (typeof window !== "undefined") window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
    Object.entries(newOverrides).forEach(([key, dishId]) => {
      syncOverride(key, dishId);
    });
  }, []);

  const clearAll = useCallback(() => {
    setOverrides({});
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(OVERRIDES_KEY);
    }
    // Delete overrides from Supabase
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("overrides").delete().eq("user_id", user.id).then();
    });
  }, []);

  return { overrides, setOne, setMany, clearAll, hydrated };
}

export function applyOverrides(overrides: Overrides): DayPlan[] {
  return BASE_PLAN.map((day, idx) => ({
    day: idx,
    breakfast: overrides[overrideKey(idx, "breakfast")] ?? day.breakfast,
    lunch: overrides[overrideKey(idx, "lunch")] ?? day.lunch,
    dinner: overrides[overrideKey(idx, "dinner")] ?? day.dinner,
  }));
}

export function currentDayIndex(cycleStart: number, now: number = Date.now()): number {
  if (!cycleStart) return 0;
  const msPerDay = 86400000;
  const startMidnight = new Date(cycleStart);
  startMidnight.setHours(0, 0, 0, 0);
  const nowMidnight = new Date(now);
  nowMidnight.setHours(0, 0, 0, 0);
  const diff = Math.floor((nowMidnight.getTime() - startMidnight.getTime()) / msPerDay);
  return ((diff % 42) + 42) % 42;
}

// ---------- Meal log ----------
export type LogStatus = "eaten" | "skipped";
export interface LogEntry { status: LogStatus; at: number }
export type MealLog = Record<string, LogEntry>;

export function logKey(cycleStart: number, dayIdx: number, slot: Slot | "snack", extra?: string): string {
  return `${cycleStart}-d${dayIdx}-${slot}${extra ? `-${extra}` : ""}`;
}

export function useMealLog() {
  const [log, setLog] = useState<MealLog>({});
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(() => {
    setLog(readLS<MealLog>(LOG_KEY, {}));
    setHydrated(true);
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      window.addEventListener("thali:sync", load);
      return () => window.removeEventListener("thali:sync", load);
    }
  }, [load]);

  const persist = (next: MealLog) => {
    if (typeof window !== "undefined") window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  };

  const setEntry = useCallback((key: string, status: LogStatus | null) => {
    let entry: LogEntry | null = null;
    setLog((prev) => {
      const next = { ...prev };
      if (status === null) {
        delete next[key];
      } else {
        entry = { status, at: Date.now() };
        next[key] = entry;
      }
      persist(next);
      return next;
    });
    syncMealLog(key, entry);
  }, []);

  const clearAll = useCallback(() => {
    setLog({});
    persist({});
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) supabase.from("meal_logs").delete().eq("user_id", user.id).then();
    });
  }, []);

  return { log, setEntry, clearAll, hydrated };
}

export function computeStreak(log: MealLog, cycleStart: number, todayIdx: number): number {
  const slots: Slot[] = ["breakfast", "lunch", "dinner"];
  let streak = 0;
  for (let i = 0; i < 42; i++) {
    const day = ((todayIdx - i) % 42 + 42) % 42;
    const ok = slots.every((s) => log[logKey(cycleStart, day, s)]?.status === "eaten");
    if (!ok) break;
    streak++;
  }
  return streak;
}

// ---------- Custom dishes ----------
export function useCustomDishes() {
  const [dishes, setDishes] = useState<CustomDish[]>([]);
  const [hydrated, setHydrated] = useState(false);

  const load = useCallback(() => {
    setDishes(readLS<CustomDish[]>(CUSTOM_DISHES_KEY, []));
    setHydrated(true);
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== "undefined") {
      window.addEventListener("thali:sync", load);
      return () => window.removeEventListener("thali:sync", load);
    }
  }, [load]);

  const persist = (next: CustomDish[]) => {
    if (typeof window !== "undefined") window.localStorage.setItem(CUSTOM_DISHES_KEY, JSON.stringify(next));
  };

  const add = useCallback((d: Omit<CustomDish, "custom" | "id"> & { id?: string }) => {
    const id = d.id ?? `c${Date.now().toString(36)}`;
    const fullDish = { ...d, id, custom: true as const };
    setDishes((prev) => {
      const next = [...prev, fullDish];
      persist(next);
      return next;
    });
    syncCustomDish(fullDish);
  }, []);

  const update = useCallback((id: string, patch: Partial<Omit<CustomDish, "custom" | "id">>) => {
    setDishes((prev) => {
      const next = prev.map((x) => (x.id === id ? { ...x, ...patch } : x));
      persist(next);
      const updatedDish = next.find(x => x.id === id);
      if (updatedDish) syncCustomDish(updatedDish);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setDishes((prev) => {
      const target = prev.find(x => x.id === id);
      if (target) syncCustomDish(target, true);
      const next = prev.filter((x) => x.id !== id);
      persist(next);
      return next;
    });
  }, []);

  return { dishes, add, update, remove, hydrated };
}

export type MealDisplayStatus = "eaten" | "skipped" | "delayed" | "pending";

export function getMealDisplayStatus(
  entry: LogEntry | undefined,
  slot: Slot,
  dayIdx: number,
  cycleStart: number,
  profile: Profile
): MealDisplayStatus {
  if (!entry) return "pending";
  if (entry.status === "skipped") return "skipped";

  // Calculate target time
  const timeStr =
    slot === "breakfast"
      ? profile.breakfastTime
      : slot === "lunch"
        ? profile.lunchTime
        : profile.dinnerTime;
  const [hours, mins] = timeStr.split(":").map(Number);

  const targetDate = new Date(cycleStart);
  targetDate.setDate(targetDate.getDate() + dayIdx);
  targetDate.setHours(hours, mins, 0, 0);

  // 30 minutes delay buffer (ponytail: 30-min hardcoded limit meets requirement cleanly)
  const bufferMs = 30 * 60 * 1000;
  if (entry.at > targetDate.getTime() + bufferMs) {
    return "delayed";
  }
  return "eaten";
}