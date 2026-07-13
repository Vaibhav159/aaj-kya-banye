import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DISHES_BY_ID, type Slot } from "@/lib/dishes";
import {
  applyOverrides,
  computeStreak,
  currentDayIndex,
  logKey,
  useCycleStart,
  useMealLog,
  useOverrides,
} from "@/lib/store";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "History · Aaj Kya Banaye?" },
      { name: "description", content: "See every meal you've logged with a 42-day adherence heatmap and top dishes." },
      { property: "og:title", content: "History · Aaj Kya Banaye?" },
      { property: "og:description", content: "Your meal-logging history and adherence." },
    ],
  }),
  component: HistoryPage,
});

const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];

function HistoryPage() {
  const { start } = useCycleStart();
  const { overrides } = useOverrides();
  const { log } = useMealLog();
  const dayIdx = currentDayIndex(start);
  const plan = useMemo(() => applyOverrides(overrides), [overrides]);
  const streak = computeStreak(log, start, dayIdx);

  const entries = Object.entries(log);
  const eatenIds = entries
    .filter(([, v]) => v.status === "eaten")
    .map(([k]) => k);
  const totalMeals = eatenIds.length;

  // Adherence per day (0..3) for the current cycle
  const perDay = Array.from({ length: 42 }, (_, i) => {
    return SLOTS.filter((s) => log[logKey(start, i, s)]?.status === "eaten").length;
  });

  // Top dishes
  const dishCount: Record<string, number> = {};
  for (let d = 0; d < 42; d++) {
    for (const s of SLOTS) {
      const entry = log[logKey(start, d, s)];
      if (entry?.status !== "eaten") continue;
      const id = plan[d][s];
      dishCount[id] = (dishCount[id] ?? 0) + 1;
    }
  }
  const top = Object.entries(dishCount).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Cuisine breakdown
  const cuisineCount: Record<string, number> = {};
  for (const [id, c] of Object.entries(dishCount)) {
    const cu = DISHES_BY_ID[id]?.cuisine ?? "other";
    cuisineCount[cu] = (cuisineCount[cu] ?? 0) + c;
  }
  const cuisines = Object.entries(cuisineCount).sort((a, b) => b[1] - a[1]);
  const totalCuisine = cuisines.reduce((s, [, n]) => s + n, 0) || 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">History</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">What you've been eating</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Meals logged" value={totalMeals} />
        <Stat label="Current streak" value={`${streak} 🔥`} />
        <Stat label="Adherence" value={`${Math.round((totalMeals / (42 * 3)) * 100)}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle>42-day heatmap</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
            {perDay.map((n, i) => {
              const opacity = n === 0 ? 0.1 : 0.25 + n * 0.25;
              const isToday = i === dayIdx;
              return (
                <div
                  key={i}
                  title={`Day ${i + 1}: ${n}/3 eaten`}
                  className={
                    "aspect-square rounded-md " +
                    (isToday ? "ring-2 ring-primary" : "")
                  }
                  style={{ background: `color-mix(in oklch, var(--color-success) ${Math.round(opacity * 100)}%, var(--color-muted))` }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-end gap-1 text-[10px] text-muted-foreground">
            <span>less</span>
            {[0.1, 0.5, 0.75, 1].map((o, i) => (
              <div key={i} className="h-3 w-3 rounded-sm" style={{ background: `color-mix(in oklch, var(--color-success) ${o * 100}%, var(--color-muted))` }} />
            ))}
            <span>more</span>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Top 5 dishes</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {top.length === 0 && <p className="text-sm text-muted-foreground">Log some meals to see your favourites.</p>}
            {top.map(([id, n]) => {
              const d = DISHES_BY_ID[id];
              if (!d) return null;
              return (
                <div key={id} className="flex items-center gap-3 rounded-md bg-secondary/40 p-2">
                  <span className="text-2xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0 truncate text-sm font-medium">{d.name}</div>
                  <span className="shrink-0 text-sm tabular-nums text-muted-foreground">×{n}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Cuisine mix</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {cuisines.length === 0 && <p className="text-sm text-muted-foreground">Nothing yet.</p>}
            {cuisines.map(([cu, n]) => {
              const pct = Math.round((n / totalCuisine) * 100);
              return (
                <div key={cu}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{cu.replace("-", " ")}</span>
                    <span className="tabular-nums text-muted-foreground">{pct}% ({n})</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="mt-1 font-display text-3xl font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}