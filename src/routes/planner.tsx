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
  const { overrides, setOne } = useOverrides();
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

  const handleDragStart = (
    e: React.DragEvent,
    dayIdx: number,
    slot: "breakfast" | "lunch" | "dinner",
    dishId: string
  ) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ dayIdx, slot, dishId }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (
    e: React.DragEvent,
    targetDayIdx: number,
    targetSlot: "breakfast" | "lunch" | "dinner"
  ) => {
    e.preventDefault();
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const source = JSON.parse(raw) as {
        dayIdx: number;
        slot: "breakfast" | "lunch" | "dinner";
        dishId: string;
      };

      if (source.dayIdx === targetDayIdx && source.slot === targetSlot) return;

      const targetDishId = plan[targetDayIdx][targetSlot];

      const sourceDish = DISHES_BY_ID[source.dishId];
      const targetDish = DISHES_BY_ID[targetDishId];

      if (!sourceDish || !targetDish) return;

      if (!sourceDish.slots.includes(targetSlot)) {
        toast.error(`"${sourceDish.name}" is not allowed at ${targetSlot}`);
        return;
      }
      if (!targetDish.slots.includes(source.slot)) {
        toast.error(`"${targetDish.name}" is not allowed at ${source.slot}`);
        return;
      }

      setOne(targetDayIdx, targetSlot, source.dishId);
      setOne(source.dayIdx, source.slot, targetDishId);
      toast.success(`Swapped ${sourceDish.name} with ${targetDish.name}`);
    } catch (err) {
      console.error("Drop error:", err);
    }
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
                <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                  {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
                    const dishId = d[slot];
                    const dish = DISHES_BY_ID[dishId];
                    if (!dish) return null;
                    return (
                      <li
                        key={slot}
                        draggable
                        onDragStart={(e) => handleDragStart(e, d.day, slot, dishId)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, d.day, slot)}
                        className="flex items-center gap-1.5 cursor-grab active:cursor-grabbing hover:bg-secondary/70 rounded p-1 transition-colors border border-transparent hover:border-border select-none"
                        title="Drag to swap this meal with another slot"
                      >
                        <span className="text-sm shrink-0">{dish.emoji}</span>
                        <span className="truncate font-medium text-foreground/80">{dish.name}</span>
                      </li>
                    );
                  })}
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
                      <td
                        className="px-4 py-2 cursor-grab active:cursor-grabbing hover:bg-secondary/60 rounded transition-colors select-none"
                        draggable
                        onDragStart={(e) => handleDragStart(e, d.day, "breakfast", d.breakfast)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, d.day, "breakfast")}
                      >
                        {DISHES_BY_ID[d.breakfast]?.emoji} {DISHES_BY_ID[d.breakfast]?.name}
                      </td>
                      <td
                        className="px-4 py-2 cursor-grab active:cursor-grabbing hover:bg-secondary/60 rounded transition-colors select-none"
                        draggable
                        onDragStart={(e) => handleDragStart(e, d.day, "lunch", d.lunch)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, d.day, "lunch")}
                      >
                        {DISHES_BY_ID[d.lunch]?.emoji} {DISHES_BY_ID[d.lunch]?.name}
                      </td>
                      <td
                        className="px-4 py-2 cursor-grab active:cursor-grabbing hover:bg-secondary/60 rounded transition-colors select-none"
                        draggable
                        onDragStart={(e) => handleDragStart(e, d.day, "dinner", d.dinner)}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, d.day, "dinner")}
                      >
                        {DISHES_BY_ID[d.dinner]?.emoji} {DISHES_BY_ID[d.dinner]?.name}
                      </td>
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