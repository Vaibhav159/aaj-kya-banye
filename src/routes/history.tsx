import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { DISHES_BY_ID, type Slot } from "@/lib/dishes";
import { SNACKS_BY_ID } from "@/lib/snacks";
import {
  applyOverrides,
  computeStreak,
  currentDayIndex,
  logKey,
  useCycleStart,
  useMealLog,
  useOverrides,
  useProfile,
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
  const { profile } = useProfile();
  const dayIdx = currentDayIndex(start);
  const plan = useMemo(() => applyOverrides(overrides), [overrides]);
  const streak = computeStreak(log, start, dayIdx);

  const entries = Object.entries(log);
  const eatenIds = entries
    .filter(([, v]) => v.status === "eaten")
    .map(([k]) => k);
  const totalMeals = eatenIds.length;

  // Aggregate past 7 calendar days nutrition
  const weeklyData = useMemo(() => {
    interface WeeklyDataPoint {
      time: number;
      name: string;
      kcal: number;
      protein: number;
      carbs: number;
      fat: number;
    }
    const days: WeeklyDataPoint[] = [];
    const msPerDay = 86400000;
    const now = Date.now();
    for (let i = 6; i >= 0; i--) {
      const time = now - i * msPerDay;
      const date = new Date(time);
      const dayLabel = date.toLocaleDateString("en-US", { weekday: "short" });
      days.push({
        time,
        name: dayLabel,
        kcal: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      });
    }

    Object.entries(log).forEach(([key, entry]) => {
      if (entry.status !== "eaten") return;
      const parts = key.split("-");
      if (parts[0] !== String(start)) return;

      const dayPart = parts[1];
      if (!dayPart || !dayPart.startsWith("d")) return;
      const dIdx = parseInt(dayPart.substring(1), 10);

      const entryDateStr = new Date(entry.at).toDateString();
      const match = days.find((d) => new Date(d.time).toDateString() === entryDateStr);

      if (match) {
        const slot = parts[2] as Slot | "snack";
        if (slot === "breakfast" || slot === "lunch" || slot === "dinner") {
          const dishId = plan[dIdx][slot];
          const dish = DISHES_BY_ID[dishId];
          if (dish) {
            match.kcal += dish.kcal;
            match.protein += dish.protein;
            match.carbs += dish.carbs;
            match.fat += dish.fat;
          }
        } else if (slot === "snack") {
          const snackId = parts[3];
          const snack = SNACKS_BY_ID[snackId];
          if (snack) {
            match.kcal += snack.kcal;
            match.protein += snack.protein;
            match.carbs += snack.carbs;
            match.fat += snack.fat;
          }
        }
      }
    });

    return days;
  }, [log, start, plan]);

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

  const chartConfig = {
    kcal: { label: "Calories", color: "var(--color-primary)" },
    protein: { label: "Protein", color: "var(--color-accent)" },
  };

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

      <Tabs defaultValue="calories" className="w-full">
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
            <div>
              <CardTitle className="font-display text-xl">Weekly Summary</CardTitle>
              <p className="text-xs text-muted-foreground">Your intake over the last 7 calendar days.</p>
            </div>
            <TabsList className="grid w-full sm:w-[200px] grid-cols-2">
              <TabsTrigger value="calories">Calories</TabsTrigger>
              <TabsTrigger value="protein">Protein</TabsTrigger>
            </TabsList>
          </CardHeader>
          <CardContent className="pt-0">
            <TabsContent value="calories" className="mt-0">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" />
                  <YAxis unit=" kcal" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="kcal" fill="var(--color-primary)" radius={[4, 4, 0, 0]} />
                  {profile.goalKcal > 0 && (
                    <ReferenceLine
                      y={profile.goalKcal}
                      stroke="oklch(0.58 0.22 27)"
                      strokeDasharray="3 3"
                      label={{ value: `${profile.goalKcal} kcal target`, fill: "oklch(0.58 0.22 27)", position: "top", fontSize: 10 }}
                    />
                  )}
                </BarChart>
              </ChartContainer>
            </TabsContent>
            <TabsContent value="protein" className="mt-0">
              <ChartContainer config={chartConfig} className="h-64 w-full">
                <BarChart data={weeklyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" />
                  <YAxis unit="g" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="protein" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
                  {profile.goalProtein > 0 && (
                    <ReferenceLine
                      y={profile.goalProtein}
                      stroke="oklch(0.58 0.22 27)"
                      strokeDasharray="3 3"
                      label={{ value: `${profile.goalProtein}g target`, fill: "oklch(0.58 0.22 27)", position: "top", fontSize: 10 }}
                    />
                  )}
                </BarChart>
              </ChartContainer>
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

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