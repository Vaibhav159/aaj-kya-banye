import { DISHES_BY_ID } from "./dishes";
import type { DayPlan } from "./plan";

export interface SlotTimes { breakfast: string; lunch: string; dinner: string }
const DEFAULT_TIMES: SlotTimes = { breakfast: "08:00", lunch: "13:00", dinner: "20:00" };
function parseHM(s: string): [number, number] {
  const [h, m] = s.split(":").map(Number);
  return [Number.isFinite(h) ? h : 8, Number.isFinite(m) ? m : 0];
}

function pad(n: number) { return String(n).padStart(2, "0"); }
function fmt(dt: Date): string {
  return (
    dt.getUTCFullYear().toString() +
    pad(dt.getUTCMonth() + 1) +
    pad(dt.getUTCDate()) +
    "T" +
    pad(dt.getUTCHours()) +
    pad(dt.getUTCMinutes()) +
    "00Z"
  );
}
function esc(s: string): string {
  return s.replace(/[\\;,]/g, (m) => "\\" + m).replace(/\n/g, "\\n");
}

export function buildIcs(plan: DayPlan[], startIdx: number, days: number, startDate: Date = new Date(), times: SlotTimes = DEFAULT_TIMES): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Aaj Kya Banaye//Meal Planner//EN",
    "CALSCALE:GREGORIAN",
  ];
  const dtstamp = fmt(new Date());
  for (let i = 0; i < days; i++) {
    const day = plan[(startIdx + i) % plan.length];
    (["breakfast", "lunch", "dinner"] as const).forEach((slot) => {
      const dish = DISHES_BY_ID[day[slot]];
      if (!dish) return;
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      const [sh, sm] = parseHM(times[slot]);
      const start = new Date(date); start.setHours(sh, sm, 0, 0);
      const end = new Date(start.getTime() + 60 * 60 * 1000);
      lines.push(
        "BEGIN:VEVENT",
        `UID:thali-${startIdx + i}-${slot}-${dish.id}@thali`,
        `DTSTAMP:${dtstamp}`,
        `DTSTART:${fmt(start)}`,
        `DTEND:${fmt(end)}`,
        `SUMMARY:${esc(`${dish.emoji} ${slot[0].toUpperCase() + slot.slice(1)}: ${dish.name}`)}`,
        `DESCRIPTION:${esc(`${dish.kcal} kcal · P${dish.protein} C${dish.carbs} F${dish.fat}`)}`,
        "END:VEVENT",
      );
    });
  }
  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function downloadIcs(filename: string, ics: string) {
  if (typeof window === "undefined") return;
  const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}