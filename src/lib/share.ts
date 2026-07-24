import { DISHES_BY_ID } from "./dishes";
import type { DayPlan } from "./plan";

export function todaySummary(day: DayPlan, dayIdx: number): string {
  const b = DISHES_BY_ID[day.breakfast];
  const l = DISHES_BY_ID[day.lunch];
  const d = DISHES_BY_ID[day.dinner];
  const kcal = (b?.kcal ?? 0) + (l?.kcal ?? 0) + (d?.kcal ?? 0);
  const protein = (b?.protein ?? 0) + (l?.protein ?? 0) + (d?.protein ?? 0);
  return [
    `🍛 Aaj Kya Banaye? · Day ${dayIdx + 1} of 42`,
    ``,
    `🌅 Breakfast — ${b?.emoji ?? ""} ${b?.name ?? ""} (${b?.kcal ?? 0} kcal, ${b?.protein ?? 0}g protein)`,
    `🍛 Lunch — ${l?.emoji ?? ""} ${l?.name ?? ""} (${l?.kcal ?? 0} kcal, ${l?.protein ?? 0}g protein)`,
    `🌙 Dinner — ${d?.emoji ?? ""} ${d?.name ?? ""} (${d?.kcal ?? 0} kcal, ${d?.protein ?? 0}g protein)`,
    ``,
    `Total: ${kcal} kcal · ${protein}g protein`,
  ].join("\n");
}

export function weekSummary(plan: DayPlan[], startIdx: number): string {
  const cycleLen = plan.length || 42;
  const days = Array.from({ length: 7 }, (_, i) => plan[(startIdx + i) % cycleLen]);
  const lines = ["🍛 Aaj Kya Banaye? · Next 7 days", ""];
  days.forEach((d, i) => {
    const b = DISHES_BY_ID[d.breakfast];
    const l = DISHES_BY_ID[d.lunch];
    const dn = DISHES_BY_ID[d.dinner];
    const kcal = (b?.kcal ?? 0) + (l?.kcal ?? 0) + (dn?.kcal ?? 0);
    const protein = (b?.protein ?? 0) + (l?.protein ?? 0) + (dn?.protein ?? 0);
    lines.push(`Day ${i + 1}: ${b?.name ?? ""} / ${l?.name ?? ""} / ${dn?.name ?? ""} (${kcal} kcal, ${protein}g protein)`);
  });
  return lines.join("\n");
}

export async function shareOrCopy(title: string, text: string): Promise<"shared" | "copied" | "failed"> {
  if (typeof navigator === "undefined") return "failed";
  const nav = navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nav.share) {
    try { await nav.share({ title, text }); return "shared"; } catch { /* fall through */ }
  }
  try { await navigator.clipboard.writeText(text); return "copied"; } catch { return "failed"; }
}