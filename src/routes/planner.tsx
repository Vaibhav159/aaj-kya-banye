import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DISHES_BY_ID } from "@/lib/dishes";
import { applyOverrides, currentDayIndex, useCycleStart, useOverrides } from "@/lib/store";
import { type DayPlan } from "@/lib/plan";
import { shareOrCopy, weekSummary } from "@/lib/share";
import { buildIcs, downloadIcs } from "@/lib/ical";
import { drawWeeklyPlan } from "@/lib/share-image";
import { generateSolvedPlan, type SolverResult } from "@/lib/plan-shuffler";
import { useCustomRules } from "@/lib/custom-rules";
import { Shuffle, ArrowRight } from "lucide-react";

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
  const { overrides, setOne, setMany } = useOverrides();
  const { rules: customRules } = useCustomRules();
  const dayIdx = currentDayIndex(start);
  const plan = useMemo(() => applyOverrides(overrides), [overrides]);

  const [isShuffleOpen, setIsShuffleOpen] = useState(false);
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [shuffleRange, setShuffleRange] = useState<"7days" | "42days">("7days");

  const previewPlan = solverResult?.plan ?? null;

  const startShuffle = (range: "7days" | "42days") => {
    setShuffleRange(range);
    const result = generateSolvedPlan(plan, range, dayIdx, customRules);
    setSolverResult(result);
  };

  const applyPreview = () => {
    if (!previewPlan) return;
    const nextOverrides: Record<string, string> = { ...overrides };
    const targetIndices = shuffleRange === "7days"
      ? Array.from({ length: 7 }, (_, i) => (dayIdx + i) % 42)
      : Array.from({ length: 42 }, (_, i) => i);
      
    for (const idx of targetIndices) {
      const shuffled = previewPlan[idx];
      nextOverrides[`d${idx}-breakfast`] = shuffled.breakfast;
      nextOverrides[`d${idx}-lunch`] = shuffled.lunch;
      nextOverrides[`d${idx}-dinner`] = shuffled.dinner;
    }
    
    setMany(nextOverrides);
    setSolverResult(null);
    setIsShuffleOpen(false);
    const relaxedCount = solverResult?.relaxed.length ?? 0;
    toast.success(
      relaxedCount > 0
        ? `Shuffled ${shuffleRange === "7days" ? "next 7 days" : "42-day cycle"} (${relaxedCount} rule${relaxedCount > 1 ? "s" : ""} relaxed)`
        : `Successfully shuffled ${shuffleRange === "7days" ? "next 7 days" : "full 42-day cycle"}!`
    );
  };

  const changedDays = useMemo(() => {
    if (!previewPlan) return [];
    const list = [];
    const targetIndices = shuffleRange === "7days"
      ? Array.from({ length: 7 }, (_, i) => (dayIdx + i) % 42)
      : Array.from({ length: 42 }, (_, i) => i);

    for (const idx of targetIndices) {
      const original = plan[idx];
      const shuffled = previewPlan[idx];
      if (
        original.breakfast !== shuffled.breakfast ||
        original.lunch !== shuffled.lunch ||
        original.dinner !== shuffled.dinner
      ) {
        list.push({ idx, original, shuffled });
      }
    }
    return list;
  }, [previewPlan, plan, shuffleRange, dayIdx]);

  const week = Array.from({ length: 7 }, (_, i) => plan[(dayIdx + i) % 42]);
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const startDate = new Date();

  const onShare = async () => {
    const r = await shareOrCopy("Aaj Kya Banaye? · Next 7 days", weekSummary(plan, dayIdx));
    if (r === "copied") toast.success("Weekly summary copied");
    else if (r === "failed") toast.error("Could not share");
  };

  const onShareLink = async () => {
    try {
      const serialized = btoa(JSON.stringify(overrides)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
      const shareUrl = `${window.location.origin}${window.location.pathname.replace(/\/planner\/?$/, "")}/?importPlan=${serialized}`;
      
      const r = await shareOrCopy("My Aaj Kya Banaye? Meal Plan", `Check out my meal plan overrides on Aaj Kya Banaye?: ${shareUrl}`);
      if (r === "copied") toast.success("Shareable plan link copied to clipboard!");
      else if (r === "shared") toast.success("Plan link shared successfully!");
      else toast.error("Could not generate or share link");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate link");
    }
  };

  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const onShareImage = () => {
    const canvas = canvasRef.current || document.createElement("canvas");
    drawWeeklyPlan(canvas, { plan, startIdx: dayIdx });
    
    canvas.toBlob(async (blob) => {
      if (!blob) {
        toast.error("Failed to generate image");
        return;
      }
      
      const file = new File([blob], "weekly-meal-plan.png", { type: "image/png" });
      
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: "Aaj Kya Banaye? Weekly Meal Plan",
            text: "My weekly Indian vegetarian meal plan!",
            files: [file],
          });
          toast.success("Shared weekly plan image!");
          return;
        } catch (e) {
          console.log("Web Share failed, falling back to download", e);
        }
      }
      
      const link = document.createElement("a");
      link.href = canvas.toDataURL("image/png");
      link.download = "aaj-kya-banaye-weekly-plan.png";
      link.click();
      toast.success("Downloaded weekly meal plan image!");
    }, "image/png");
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
          <Button onClick={() => setIsShuffleOpen(true)} className="flex items-center gap-1.5 bg-primary hover:bg-primary/95 cursor-pointer">
            <Shuffle className="h-4 w-4" /> Shuffle / Rotate
          </Button>
          <Button variant="outline" onClick={onShare}>Share summary</Button>
          <Button variant="outline" onClick={onShareLink}>Share plan link</Button>
          <Button variant="outline" onClick={onShareImage}>Share image</Button>
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
      <canvas ref={canvasRef} className="hidden" />

      <Dialog open={isShuffleOpen} onOpenChange={(open) => {
        setIsShuffleOpen(open);
        if (!open) setSolverResult(null);
      }}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">
              {previewPlan ? "Preview Shuffled Plan" : "Shuffle & Rotate"}
            </DialogTitle>
            <DialogDescription>
              {previewPlan
                ? "Review the changes before saving."
                : "Constraint solver generates rule-compliant plans. Active rules are enforced automatically."}
            </DialogDescription>
          </DialogHeader>

          {previewPlan === null ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-6">
              <Button
                variant="outline"
                onClick={() => startShuffle("7days")}
                className="h-32 flex flex-col justify-center gap-2 text-lg font-semibold hover:border-primary/50 group cursor-pointer"
              >
                <Shuffle className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                <span>Shuffle Next 7 Days</span>
                <span className="text-xs font-normal text-muted-foreground max-w-[200px] text-center">
                  Only shuffle meals for the upcoming week cycle
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => startShuffle("42days")}
                className="h-32 flex flex-col justify-center gap-2 text-lg font-semibold hover:border-primary/50 group cursor-pointer"
              >
                <Shuffle className="h-6 w-6 text-muted-foreground group-hover:text-primary" />
                <span>Shuffle Full 42 Days</span>
                <span className="text-xs font-normal text-muted-foreground max-w-[200px] text-center">
                  Re-rotate and shuffle all meals in the 42-day rotation
                </span>
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-2 max-h-[50vh]">
              {/* Solver quality feedback */}
              {solverResult && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full font-medium ${
                    solverResult.score >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : solverResult.score >= 50 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {solverResult.score >= 80 ? "✓" : solverResult.score >= 50 ? "⚠" : "✗"}
                    {solverResult.score}% quality
                  </span>
                  {solverResult.relaxed.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium">
                      ⚡ {solverResult.relaxed.length} rule{solverResult.relaxed.length > 1 ? "s" : ""} relaxed
                    </span>
                  )}
                  {solverResult.violations.length > 0 && (
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-medium">
                      {solverResult.violations.length} violation{solverResult.violations.length > 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              )}
              {/* Relaxation details */}
              {solverResult && solverResult.relaxed.length > 0 && (
                <div className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 rounded-lg p-2.5 space-y-1">
                  <div className="font-semibold">Relaxed rules (couldn't satisfy all constraints):</div>
                  <ul className="list-disc list-inside">
                    {solverResult.relaxed.map((id) => {
                      const rule = customRules.find((r) => r.id === id);
                      return <li key={id}>{rule?.label ?? id}</li>;
                    })}
                  </ul>
                </div>
              )}
              {changedDays.map(({ idx, original, shuffled }) => {
                const bChanged = original.breakfast !== shuffled.breakfast;
                const lChanged = original.lunch !== shuffled.lunch;
                const dChanged = original.dinner !== shuffled.dinner;

                return (
                  <div key={idx} className="border border-border/60 rounded-lg p-3 bg-secondary/15 space-y-2">
                    <div className="font-semibold text-sm text-foreground">Day {idx + 1}</div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      {/* Breakfast */}
                      <div className="space-y-0.5">
                        <div className="text-muted-foreground font-medium uppercase tracking-wide text-[9px]">Breakfast</div>
                        {bChanged ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="line-through text-muted-foreground/80">
                              {DISHES_BY_ID[original.breakfast]?.emoji} {DISHES_BY_ID[original.breakfast]?.name}
                            </span>
                            <span className="text-success font-semibold flex items-center gap-1">
                              <ArrowRight className="h-3 w-3 inline shrink-0" />
                              {DISHES_BY_ID[shuffled.breakfast]?.emoji} {DISHES_BY_ID[shuffled.breakfast]?.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/80">
                            {DISHES_BY_ID[original.breakfast]?.emoji} {DISHES_BY_ID[original.breakfast]?.name}
                          </span>
                        )}
                      </div>

                      {/* Lunch */}
                      <div className="space-y-0.5">
                        <div className="text-muted-foreground font-medium uppercase tracking-wide text-[9px]">Lunch</div>
                        {lChanged ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="line-through text-muted-foreground/80">
                              {DISHES_BY_ID[original.lunch]?.emoji} {DISHES_BY_ID[original.lunch]?.name}
                            </span>
                            <span className="text-success font-semibold flex items-center gap-1">
                              <ArrowRight className="h-3 w-3 inline shrink-0" />
                              {DISHES_BY_ID[shuffled.lunch]?.emoji} {DISHES_BY_ID[shuffled.lunch]?.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/80">
                            {DISHES_BY_ID[original.lunch]?.emoji} {DISHES_BY_ID[original.lunch]?.name}
                          </span>
                        )}
                      </div>

                      {/* Dinner */}
                      <div className="space-y-0.5">
                        <div className="text-muted-foreground font-medium uppercase tracking-wide text-[9px]">Dinner</div>
                        {dChanged ? (
                          <div className="flex flex-col gap-0.5">
                            <span className="line-through text-muted-foreground/80">
                              {DISHES_BY_ID[original.dinner]?.emoji} {DISHES_BY_ID[original.dinner]?.name}
                            </span>
                            <span className="text-success font-semibold flex items-center gap-1">
                              <ArrowRight className="h-3 w-3 inline shrink-0" />
                              {DISHES_BY_ID[shuffled.dinner]?.emoji} {DISHES_BY_ID[shuffled.dinner]?.name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground/80">
                            {DISHES_BY_ID[original.dinner]?.emoji} {DISHES_BY_ID[original.dinner]?.name}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              {changedDays.length === 0 && (
                <div className="text-center py-8 text-sm text-muted-foreground">
                  No changes suggested. Click below to shuffle again.
                </div>
              )}
            </div>
          )}

          <DialogFooter className="border-t pt-4">
            {previewPlan ? (
              <div className="flex w-full justify-between items-center gap-2 flex-wrap">
                <Button variant="outline" onClick={() => setSolverResult(null)}>
                  Back
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => startShuffle(shuffleRange)} className="cursor-pointer">
                    Shuffle Again
                  </Button>
                  <Button onClick={applyPreview} className="cursor-pointer">
                    Apply Changes
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => setIsShuffleOpen(false)}>
                Cancel
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}