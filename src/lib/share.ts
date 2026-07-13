import { DISHES_BY_ID } from "./dishes";
import type { DayPlan } from "./plan";

export function todaySummary(day: DayPlan, dayIdx: number): string {
  const b = DISHES_BY_ID[day.breakfast];
  const l = DISHES_BY_ID[day.lunch];
  const d = DISHES_BY_ID[day.dinner];
  const kcal = (b?.kcal ?? 0) + (l?.kcal ?? 0) + (d?.kcal ?? 0);
  return [
    `🍛 Aaj Kya Banaye? · Day ${dayIdx + 1} of 42`,
    ``,
    `🌅 Breakfast — ${b?.emoji ?? ""} ${b?.name ?? ""} (${b?.kcal ?? 0} kcal)`,
    `🍛 Lunch — ${l?.emoji ?? ""} ${l?.name ?? ""} (${l?.kcal ?? 0} kcal)`,
    `🌙 Dinner — ${d?.emoji ?? ""} ${d?.name ?? ""} (${d?.kcal ?? 0} kcal)`,
    ``,
    `Total: ${kcal} kcal`,
  ].join("\n");
}

export function weekSummary(plan: DayPlan[], startIdx: number): string {
  const days = Array.from({ length: 7 }, (_, i) => plan[(startIdx + i) % 42]);
  const lines = ["🍛 Aaj Kya Banaye? · Next 7 days", ""];
  days.forEach((d, i) => {
    const b = DISHES_BY_ID[d.breakfast]?.name;
    const l = DISHES_BY_ID[d.lunch]?.name;
    const dn = DISHES_BY_ID[d.dinner]?.name;
    lines.push(`Day ${i + 1}: ${b} / ${l} / ${dn}`);
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