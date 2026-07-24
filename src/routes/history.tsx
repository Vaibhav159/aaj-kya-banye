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
  useCycleStart,
  useOverrides,
  useMealLog,
  useProfile,
  applyOverrides,
  currentDayIndex,
  logKey,
  formatCycleDuration,
  computeStreak,
  getMealDisplayStatus,
} from "@/lib/store";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/history")({
  head: () => ({
    meta: [
      { title: "Meal History & Streak Analytics · Aaj Kya Banaye?" },
      { name: "description", content: "Track meal logging history, streak counts, daily macro adherence heatmaps, and dish statistics for your Indian vegetarian diet plan." },
      { property: "og:title", content: "Meal History & Streak Analytics · Aaj Kya Banaye?" },
      { property: "og:description", content: "Analytics, streaks, and adherence heatmaps for your meal plan." },
    ],
  }),
  component: HistoryPage,
});

const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];

function HistoryPage() {
  const { start, length } = useCycleStart();
  const { overrides } = useOverrides();
  const { log } = useMealLog();
  const { profile } = useProfile();
  const dayIdx = currentDayIndex(start, Date.now(), length);
  const plan = useMemo(() => applyOverrides(overrides, length), [overrides, length]);
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

  // Adherence and skipped meals per day for the current cycle
  const perDayData = useMemo(() => {
    return Array.from({ length }, (_, i) => {
      const eaten = SLOTS.filter((s) => log[logKey(start, i, s)]?.status === "eaten").length;
      const skipped = SLOTS.filter((s) => log[logKey(start, i, s)]?.status === "skipped").length;
      return { eaten, skipped };
    });
  }, [log, start, length]);

  // Top dishes
  const dishCount: Record<string, number> = {};
  for (let d = 0; d < length; d++) {
    for (const s of SLOTS) {
      const entry = log[logKey(start, d, s)];
      if (entry?.status !== "eaten") continue;
      const id = plan[d] ? plan[d][s] : null;
      if (id) dishCount[id] = (dishCount[id] ?? 0) + 1;
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

  // Detailed chronological logs
  const detailedLogs = useMemo(() => {
    interface LogDetailItem {
      key: string;
      dayIdx: number;
      slot: Slot | "snack";
      dishId: string;
      name: string;
      emoji: string;
      status: "eaten" | "skipped" | "delayed";
      loggedAt: number;
      targetTimeStr?: string;
    }

    const list: LogDetailItem[] = [];
    Object.entries(log).forEach(([key, entry]) => {
      const parts = key.split("-");
      if (parts[0] !== String(start)) return;

      const dayPart = parts[1];
      if (!dayPart || !dayPart.startsWith("d")) return;
      const dIdx = parseInt(dayPart.substring(1), 10);

      const slot = parts[2] as Slot | "snack";
      let dishId = "";
      let name = "";
      let emoji = "";
      let targetTimeStr = "";

      if (slot === "breakfast" || slot === "lunch" || slot === "dinner") {
        dishId = plan[dIdx][slot];
        const dish = DISHES_BY_ID[dishId];
        if (dish) {
          name = dish.name;
          emoji = dish.emoji;
        }
        targetTimeStr =
          slot === "breakfast"
            ? profile.breakfastTime
            : slot === "lunch"
              ? profile.lunchTime
              : profile.dinnerTime;
      } else if (slot === "snack") {
        dishId = parts[3];
        const snack = SNACKS_BY_ID[dishId];
        if (snack) {
          name = snack.name;
          emoji = snack.emoji;
        }
      }

      if (!name) return;

      const displayStatus = getMealDisplayStatus(entry, slot === "snack" ? "breakfast" : slot, dIdx, start, profile);
      const status: "eaten" | "skipped" | "delayed" =
        slot === "snack"
          ? "eaten"
          : displayStatus === "delayed"
            ? "delayed"
            : entry.status === "skipped"
              ? "skipped"
              : "eaten";

      list.push({
        key,
        dayIdx: dIdx,
        slot,
        dishId,
        name,
        emoji,
        status,
        loggedAt: entry.at,
        targetTimeStr: slot !== "snack" ? targetTimeStr : undefined,
      });
    });

    return list.sort((a, b) => b.loggedAt - a.loggedAt);
  }, [log, start, plan, profile]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">History</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">What you've been eating</h1>
      </header>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Meals logged" value={totalMeals} />
        <Stat label="Current streak" value={`${streak} 🔥`} />
        <Stat label="Adherence" value={`${Math.round((totalMeals / (length * 3)) * 100)}%`} />
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
        <CardHeader><CardTitle>{formatCycleDuration(length)} Heatmap</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-1.5 sm:grid-cols-14">
            {perDayData.map(({ eaten, skipped }, i) => {
              const isToday = i === dayIdx;
              
              let background = "";
              if (skipped > 0) {
                const skipWeight = skipped / 3;
                background = `color-mix(in oklch, var(--color-destructive) ${Math.round(skipWeight * 100)}%, var(--color-muted))`;
              } else if (eaten > 0) {
                const opacity = 0.25 + eaten * 0.25;
                background = `color-mix(in oklch, var(--color-success) ${Math.round(opacity * 100)}%, var(--color-muted))`;
              } else {
                background = "color-mix(in oklch, var(--color-foreground) 10%, var(--color-muted))";
              }

              return (
                <div
                  key={i}
                  title={`Day ${i + 1}: ${eaten}/3 eaten, ${skipped}/3 skipped`}
                  className={
                    "aspect-square rounded-md transition hover:scale-105 " +
                    (isToday ? "ring-2 ring-primary ring-offset-2" : "")
                  }
                  style={{ background }}
                />
              );
            })}
          </div>
          <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span>Skipped:</span>
              <div className="h-3 w-3 rounded-sm bg-destructive" />
            </div>
            <div className="flex items-center gap-1">
              <span>less eaten</span>
              {[0.25, 0.5, 0.75, 1.0].map((o, i) => (
                <div key={i} className="h-3 w-3 rounded-sm" style={{ background: `color-mix(in oklch, var(--color-success) ${o * 100}%, var(--color-muted))` }} />
              ))}
              <span>more eaten</span>
            </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Detailed Log History</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {detailedLogs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No meals logged yet. Log some meals on the Today page to see them here.</p>
          ) : (
            <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground sticky top-0 z-10">
                  <tr>
                    <th className="px-4 py-2">Logged At</th>
                    <th className="px-4 py-2">Day</th>
                    <th className="px-4 py-2">Meal / Slot</th>
                    <th className="px-4 py-2">Dish</th>
                    <th className="px-4 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {detailedLogs.map((item) => {
                    const dateStr = new Date(item.loggedAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    });

                    const statusColors = {
                      eaten: "bg-success/15 text-success border-success/30",
                      delayed: "bg-warning/15 text-warning-foreground dark:text-warning border-warning/30",
                      skipped: "bg-destructive/15 text-destructive border-destructive/30",
                    };

                    return (
                      <tr key={item.key} className="border-t border-border/60 hover:bg-secondary/20">
                        <td className="px-4 py-2.5 whitespace-nowrap text-muted-foreground">{dateStr}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap font-medium">Day {item.dayIdx + 1}</td>
                        <td className="px-4 py-2.5 whitespace-nowrap capitalize text-muted-foreground">
                          {item.slot} {item.targetTimeStr && `(${item.targetTimeStr})`}
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap flex items-center gap-2">
                          <span className="text-xl">{item.emoji}</span>
                          <span className="font-medium text-foreground">{item.name}</span>
                        </td>
                        <td className="px-4 py-2.5 whitespace-nowrap">
                          <span className={`inline-block rounded-full border px-2 py-0.5 text-xs font-semibold capitalize ${statusColors[item.status]}`}>
                            {item.status === "delayed" ? "delayed" : item.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
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