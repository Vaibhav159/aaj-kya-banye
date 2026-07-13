import { useCallback, useEffect, useState } from "react";
import { BASE_PLAN, type DayPlan } from "./plan";
import type { Dish, Slot } from "./dishes";

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

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setProfile({ ...DEFAULT_PROFILE, ...readLS<Partial<Profile>>(PROFILE_KEY, {}) });
    setHydrated(true);
  }, []);
  const save = useCallback((next: Profile) => {
    setProfile(next);
    if (typeof window !== "undefined") window.localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
  }, []);
  return { profile, save, hydrated };
}

export function useCycleStart() {
  const [start, setStart] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const stored = readLS<number | null>(CYCLE_KEY, null);
    if (stored) {
      setStart(stored);
    } else {
      const now = Date.now();
      if (typeof window !== "undefined") window.localStorage.setItem(CYCLE_KEY, JSON.stringify(now));
      setStart(now);
    }
    setHydrated(true);
  }, []);
  const reset = useCallback(() => {
    const now = Date.now();
    if (typeof window !== "undefined") window.localStorage.setItem(CYCLE_KEY, JSON.stringify(now));
    setStart(now);
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
  useEffect(() => {
    setOverrides(readLS<Overrides>(OVERRIDES_KEY, {}));
    setHydrated(true);
  }, []);
  const setOne = useCallback((dayIdx: number, slot: Slot, dishId: string) => {
    setOverrides((prev) => {
      const next = { ...prev, [overrideKey(dayIdx, slot)]: dishId };
      if (typeof window !== "undefined") window.localStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);
  const clearAll = useCallback(() => {
    setOverrides({});
    if (typeof window !== "undefined") window.localStorage.removeItem(OVERRIDES_KEY);
  }, []);
  return { overrides, setOne, clearAll, hydrated };
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
// Key format: `${cycleStart}-d${dayIdx}-${slot}` -> { status, at }
export type LogStatus = "eaten" | "skipped";
export interface LogEntry { status: LogStatus; at: number }
export type MealLog = Record<string, LogEntry>;

export function logKey(cycleStart: number, dayIdx: number, slot: Slot | "snack", extra?: string): string {
  return `${cycleStart}-d${dayIdx}-${slot}${extra ? `-${extra}` : ""}`;
}

export function useMealLog() {
  const [log, setLog] = useState<MealLog>({});
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setLog(readLS<MealLog>(LOG_KEY, {}));
    setHydrated(true);
  }, []);
  const persist = (next: MealLog) => {
    if (typeof window !== "undefined") window.localStorage.setItem(LOG_KEY, JSON.stringify(next));
  };
  const setEntry = useCallback((key: string, status: LogStatus | null) => {
    setLog((prev) => {
      const next = { ...prev };
      if (status === null) delete next[key];
      else next[key] = { status, at: Date.now() };
      persist(next);
      return next;
    });
  }, []);
  const clearAll = useCallback(() => { setLog({}); persist({}); }, []);
  return { log, setEntry, clearAll, hydrated };
}

/** Consecutive days ending today where all 3 slots are marked eaten. */
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
export type CustomDish = Dish & { custom: true };

export function useCustomDishes() {
  const [dishes, setDishes] = useState<CustomDish[]>([]);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    setDishes(readLS<CustomDish[]>(CUSTOM_DISHES_KEY, []));
    setHydrated(true);
  }, []);
  const persist = (next: CustomDish[]) => {
    if (typeof window !== "undefined") window.localStorage.setItem(CUSTOM_DISHES_KEY, JSON.stringify(next));
  };
  const add = useCallback((d: Omit<CustomDish, "custom" | "id"> & { id?: string }) => {
    setDishes((prev) => {
      const id = d.id ?? `c${Date.now().toString(36)}`;
      const next = [...prev, { ...d, id, custom: true as const }];
      persist(next);
      return next;
    });
  }, []);
  const remove = useCallback((id: string) => {
    setDishes((prev) => { const next = prev.filter((x) => x.id !== id); persist(next); return next; });
  }, []);
  return { dishes, add, remove, hydrated };
}