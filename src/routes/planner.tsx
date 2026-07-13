import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DISHES_BY_ID } from "@/lib/dishes";
import { applyOverrides, currentDayIndex, useCycleStart, useOverrides } from "@/lib/store";
import { shareOrCopy, weekSummary } from "@/lib/share";
import { buildIcs, downloadIcs } from "@/lib/ical";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner · Aaj Kya Banaye?" },
      { name: "description", content: "Rolling 7-day view and full 42-day rotation of your Indian vegetarian meal plan." },
      { property: "og:title", content: "Planner · Aaj Kya Banaye?" },
      { property: "og:description", content: "7-day and 42-day meal planner with calorie totals." },
    ],
  }),
  component: PlannerPage,
});

function dayKcal(dayIds: [string, string, string]): number {
  return dayIds.reduce((s, id) => s + (DISHES_BY_ID[id]?.kcal ?? 0), 0);
}

function PlannerPage() {
  const { start } = useCycleStart();
  const { overrides } = useOverrides();
  const dayIdx = currentDayIndex(start);
  const plan = useMemo(() => applyOverrides(overrides), [overrides]);

  const week = Array.from({ length: 7 }, (_, i) => plan[(dayIdx + i) % 42]);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const startDate = new Date();

  const onShare = async () => {
    const r = await shareOrCopy("Aaj Kya Banaye? · Next 7 days", weekSummary(plan, dayIdx));
    if (r === "copied") toast.success("Weekly summary copied");
    else if (r === "failed") toast.error("Could not share");
  };
  const onIcs = () => {
    downloadIcs("thali-week.ics", buildIcs(plan, dayIdx, 7));
    toast.success("Downloaded thali-week.ics — import into your calendar");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Weekly Planner</p>
          <h1 className="font-display text-4xl font-semibold">Next 7 days</h1>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onShare}>Share summary</Button>
          <Button variant="outline" onClick={onIcs}>Export .ics</Button>
        </div>
      </header>

      <div className="grid gap-3 md:grid-cols-7">
        {week.map((d, i) => {
          const date = new Date(startDate.getTime() + i * 86400000);
          const kcal = dayKcal([d.breakfast, d.lunch, d.dinner]);
          return (
            <Card key={i} className={i === 0 ? "border-primary shadow-md" : ""}>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{dayLabels[date.getDay()]}</div>
                <div className="font-display text-2xl font-semibold">{date.getDate()}</div>
                <div className="mt-2 text-xs text-muted-foreground">Day {d.day + 1}</div>
                <div className="mt-2 font-medium text-primary">{kcal} kcal</div>
                <ul className="mt-3 space-y-1 text-xs text-muted-foreground">
                  <li>{DISHES_BY_ID[d.breakfast]?.emoji} {DISHES_BY_ID[d.breakfast]?.name}</li>
                  <li>{DISHES_BY_ID[d.lunch]?.emoji} {DISHES_BY_ID[d.lunch]?.name}</li>
                  <li>{DISHES_BY_ID[d.dinner]?.emoji} {DISHES_BY_ID[d.dinner]?.name}</li>
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-display text-2xl">Full 42-day cycle</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/60 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-4 py-2">Day</th>
                  <th className="px-4 py-2">Breakfast</th>
                  <th className="px-4 py-2">Lunch</th>
                  <th className="px-4 py-2">Dinner</th>
                  <th className="px-4 py-2 text-right">kcal</th>
                </tr>
              </thead>
              <tbody>
                {plan.map((d) => {
                  const kcal = dayKcal([d.breakfast, d.lunch, d.dinner]);
                  const isToday = d.day === dayIdx;
                  return (
                    <tr
                      key={d.day}
                      className={
                        "border-t border-border/60 " +
                        (isToday ? "bg-primary/10 font-medium" : "hover:bg-secondary/30")
                      }
                    >
                      <td className="px-4 py-2">{d.day + 1}{isToday ? " · today" : ""}</td>
                      <td className="px-4 py-2">{DISHES_BY_ID[d.breakfast]?.emoji} {DISHES_BY_ID[d.breakfast]?.name}</td>
                      <td className="px-4 py-2">{DISHES_BY_ID[d.lunch]?.emoji} {DISHES_BY_ID[d.lunch]?.name}</td>
                      <td className="px-4 py-2">{DISHES_BY_ID[d.dinner]?.emoji} {DISHES_BY_ID[d.dinner]?.name}</td>
                      <td className="px-4 py-2 text-right">{kcal}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}