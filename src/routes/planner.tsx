import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DISHES_BY_ID, type Dish } from "@/lib/dishes";
import { applyOverrides, currentDayIndex, useCycleStart, useOverrides, useFavorites, formatCycleDuration } from "@/lib/store";
import { type DayPlan } from "@/lib/plan";
import { shareOrCopy, weekSummary } from "@/lib/share";
import { buildIcs, downloadIcs } from "@/lib/ical";
import { drawWeeklyPlan } from "@/lib/share-image";
import { generateSolvedPlan, type SolverResult } from "@/lib/plan-shuffler";
import { useCustomRules } from "@/lib/custom-rules";
import { Shuffle, ArrowRight, Sparkles, Heart, Share2, FileText, Link as LinkIcon, Image as ImageIcon, Calendar, Search } from "lucide-react";

import { DishDetailDialog } from "@/components/dish-detail";
import { SearchPlannerDialog } from "@/components/search-planner-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "42-Day Indian Vegetarian Meal Planner & Calendar · Aaj Kya Banaye?" },
      { name: "description", content: "Interactive 42-day rotating Indian vegetarian meal calendar. Swap dishes, balance daily calories, shuffle plans based on custom nutrition rules, and export to iCal." },
      { property: "og:title", content: "42-Day Indian Vegetarian Meal Calendar · Aaj Kya Banaye?" },
      { property: "og:description", content: "42-day rotating meal plan calendar with constraint solver and macro breakdown." },
    ],
  }),
  component: PlannerPage,
});

function dayKcal(dayIds: [string, string, string]): number {
  return dayIds.reduce((s, id) => s + (DISHES_BY_ID[id]?.kcal ?? 0), 0);
}

function PlannerPage() {
  const { start, length } = useCycleStart();
  const { overrides, setOne, setMany } = useOverrides();
  const { rules: customRules } = useCustomRules();
  const dayIdx = currentDayIndex(start, Date.now(), length);
  const plan = useMemo(() => applyOverrides(overrides, length), [overrides, length]);

  const [isShuffleOpen, setIsShuffleOpen] = useState(false);
  const [isSearchPlannerOpen, setIsSearchPlannerOpen] = useState(false);
  const [solverResult, setSolverResult] = useState<SolverResult | null>(null);
  const [shuffleRange, setShuffleRange] = useState<"7days" | "full">("7days");

  const previewPlan = solverResult?.plan ?? null;

  const startShuffle = (range: "7days" | "full") => {
    setShuffleRange(range);
    const result = generateSolvedPlan(plan, range, dayIdx, customRules);
    setSolverResult(result);
  };

  const applyPreview = () => {
    if (!previewPlan) return;
    const nextOverrides: Record<string, string> = { ...overrides };
    const targetIndices = shuffleRange === "7days"
      ? Array.from({ length: 7 }, (_, i) => (dayIdx + i) % length)
      : Array.from({ length }, (_, i) => i);
      
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
        ? `Shuffled ${shuffleRange === "7days" ? "next 7 days" : "full cycle"} (${relaxedCount} rule${relaxedCount > 1 ? "s" : ""} relaxed)`
        : `Successfully shuffled ${shuffleRange === "7days" ? "next 7 days" : "full meal cycle"}!`
    );
  };

  const changedDays = useMemo(() => {
    if (!previewPlan) return [];
    const list = [];
    const targetIndices = shuffleRange === "7days"
      ? Array.from({ length: 7 }, (_, i) => (dayIdx + i) % length)
      : Array.from({ length }, (_, i) => i);

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

  const week = Array.from({ length: 7 }, (_, i) => plan[(dayIdx + i) % length]);
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
    downloadIcs("meal-plan-week.ics", buildIcs(plan, dayIdx, 7));
    toast.success("Downloaded meal-plan-week.ics — import into your calendar");
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

  const [detailDish, setDetailDish] = useState<Dish | null>(null);
  // ponytail: default to the week containing today's day index
  const [tableWeek, setTableWeek] = useState<number | "all">(() => Math.floor(dayIdx / 7) + 1);
  const [tableSearch, setTableSearch] = useState<string>("");

  const { isFavorite } = useFavorites();

  const totalWeeks = useMemo(() => Math.ceil(length / 7), [length]);

  const filteredPlan = useMemo(() => {
    let list = plan;
    if (tableWeek !== "all") {
      const startDay = (tableWeek - 1) * 7;
      const endDay = startDay + 7;
      list = list.filter((d) => d.day >= startDay && d.day < endDay);
    }
    if (tableSearch.trim()) {
      const q = tableSearch.toLowerCase().trim();
      list = list.filter((d) => {
        const b = DISHES_BY_ID[d.breakfast]?.name.toLowerCase() ?? "";
        const l = DISHES_BY_ID[d.lunch]?.name.toLowerCase() ?? "";
        const din = DISHES_BY_ID[d.dinner]?.name.toLowerCase() ?? "";
        return b.includes(q) || l.includes(q) || din.includes(q) || (d.day + 1).toString() === q;
      });
    }
    return list;
  }, [plan, tableWeek, tableSearch]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8 space-y-6 sm:space-y-10 pb-24 md:pb-8">
      {/* Header */}
      <header className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-widest font-semibold text-muted-foreground mb-0.5">
            Meal Planner
          </p>
          <h1 className="font-display text-2xl sm:text-4xl font-semibold tracking-tight">
            This Week
          </h1>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <Button
            onClick={() => {
              setIsShuffleOpen(true);
              startShuffle("7days");
            }}
            size="sm"
            className="flex items-center gap-1.5 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Shuffle Plan</span>
          </Button>
          <Button onClick={() => setIsSearchPlannerOpen(true)} variant="outline" size="sm" className="flex items-center gap-1.5 cursor-pointer">
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Search & Plan</span>
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="cursor-pointer px-2 sm:px-3">
                <Share2 className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onShare} className="cursor-pointer">
                <FileText className="h-4 w-4 mr-2" /> Text summary
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShareLink} className="cursor-pointer">
                <LinkIcon className="h-4 w-4 mr-2" /> Plan link
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onShareImage} className="cursor-pointer">
                <ImageIcon className="h-4 w-4 mr-2" /> Plan image
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onIcs} className="cursor-pointer">
                <Calendar className="h-4 w-4 mr-2" /> Export .ics
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* 7 Days — horizontal scroll strip */}
      <div className="-mx-4 px-4">
        <div className="flex gap-2.5 overflow-x-auto pb-2 snap-x snap-mandatory no-scrollbar">
          {week.map((d, i) => {
            const date = new Date(startDate.getTime() + i * 86400000);
            const kcal = dayKcal([d.breakfast, d.lunch, d.dinner]);
            const isToday = i === 0;
            const slots = ["breakfast", "lunch", "dinner"] as const;
            const slotLabels = { breakfast: "Breakfast", lunch: "Lunch", dinner: "Dinner" } as const;

            return (
              <div
                key={i}
                className={`shrink-0 snap-start w-[155px] sm:w-[200px] md:w-[220px] rounded-xl border transition-all duration-200 ${
                  isToday
                    ? "border-primary/50 bg-primary/[0.04] dark:bg-primary/[0.08] shadow-md ring-1 ring-primary/20"
                    : "border-border/60 bg-card hover:shadow-xs hover:border-border"
                }`}
              >
                {/* Card header */}
                <div className={`px-3 pt-2.5 pb-1.5 sm:px-3.5 sm:pt-3 sm:pb-2 ${isToday ? "border-b border-primary/15" : "border-b border-border/40"}`}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {dayLabels[date.getDay()]}
                    </span>
                    {isToday && (
                      <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-primary">
                        Today
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                      {date.getDate()}
                    </span>
                    <span className="text-[10px] sm:text-[11px] font-medium text-primary tabular-nums">
                      {kcal}
                    </span>
                  </div>
                </div>

                {/* Meals */}
                <div className="p-1.5 sm:p-2 space-y-0.5 sm:space-y-1.5">
                  {slots.map((slot) => {
                    const dishId = d[slot];
                    const dish = DISHES_BY_ID[dishId];
                    if (!dish) return null;
                    const fav = isFavorite(dish.id);

                    return (
                      <TooltipProvider key={slot}>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <div
                              draggable
                              onDragStart={(e) => handleDragStart(e, d.day, slot, dishId)}
                              onDragOver={handleDragOver}
                              onDrop={(e) => handleDrop(e, d.day, slot)}
                              onClick={() => setDetailDish(dish)}
                              className="group rounded-md px-2 py-1.5 sm:px-2.5 sm:py-2 hover:bg-secondary/60 cursor-grab active:cursor-grabbing transition-colors select-none"
                            >
                              <div className="text-[9px] sm:text-[10px] uppercase tracking-wider font-semibold text-muted-foreground/70 mb-0.5">
                                {slotLabels[slot]}
                              </div>
                              <div className="flex items-center gap-1 sm:gap-1.5">
                                <span className="text-xs sm:text-sm shrink-0 leading-none">{dish.emoji}</span>
                                <span className="text-[11px] sm:text-[13px] font-medium text-foreground leading-snug line-clamp-2">
                                  {dish.name}
                                </span>
                                {fav && <Heart className="h-2.5 w-2.5 sm:h-3 sm:w-3 fill-rose-500 text-rose-500 shrink-0 ml-auto" />}
                              </div>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs p-2.5 space-y-1 max-w-[220px]">
                            <div className="font-semibold">{dish.emoji} {dish.name}</div>
                            <div className="text-muted-foreground">
                              {dish.kcal} kcal · P {dish.protein}g · C {dish.carbs}g · F {dish.fat}g
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <DishDetailDialog dish={detailDish} open={detailDish !== null} onOpenChange={(o) => !o && setDetailDish(null)} />

      {/* Full Cycle View */}
      <section className="space-y-3 sm:space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-4">
          <div>
            <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight">
              Full Cycle
            </h2>
            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5">
              {formatCycleDuration(length)} rotation · Day {dayIdx + 1} of {length}
            </p>
          </div>
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search meals..."
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              className="w-full bg-secondary/40 border border-input rounded-lg pl-8 pr-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 transition-shadow"
            />
          </div>
        </div>

        {/* Week Tabs */}
        {totalWeeks > 1 && (
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            <button
              type="button"
              onClick={() => setTableWeek("all")}
              className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                tableWeek === "all"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
              }`}
            >
              All
            </button>
            {Array.from({ length: totalWeeks }, (_, idx) => idx + 1).map((wNum) => (
              <button
                key={wNum}
                type="button"
                onClick={() => setTableWeek(wNum)}
                className={`px-2.5 py-1 rounded-full text-[11px] sm:text-xs font-medium cursor-pointer transition-colors whitespace-nowrap ${
                  tableWeek === wNum
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                Wk {wNum}
              </button>
            ))}
          </div>
        )}

        {/* Mobile: stacked card list — day header sticks while scrolling */}
        <div className="md:hidden space-y-2">
          {filteredPlan.map((d) => {
            const kcal = dayKcal([d.breakfast, d.lunch, d.dinner]);
            const isToday = d.day === dayIdx;
            return (
              <div
                key={d.day}
                className={`rounded-lg border p-3 transition-colors ${
                  isToday
                    ? "border-primary/40 bg-primary/[0.04] dark:bg-primary/[0.08]"
                    : "border-border/50 bg-card"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className={`text-xs font-semibold ${isToday ? "text-primary" : "text-foreground"}`}>
                    Day {d.day + 1}{isToday ? " · today" : ""}
                  </span>
                  <span className="text-[11px] font-medium text-muted-foreground tabular-nums">{kcal} kcal</span>
                </div>
                <div className="space-y-1.5">
                  {(["breakfast", "lunch", "dinner"] as const).map((slot) => {
                    const dish = DISHES_BY_ID[d[slot]];
                    if (!dish) return null;
                    return (
                      <div
                        key={slot}
                        className="flex items-center gap-2 text-[12px] py-1 px-1.5 rounded hover:bg-secondary/50 cursor-grab active:cursor-grabbing select-none transition-colors"
                        draggable
                        onDragStart={(e) => handleDragStart(e, d.day, slot, d[slot])}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, d.day, slot)}
                      >
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground w-8 shrink-0">
                          {slot === "breakfast" ? "B" : slot === "lunch" ? "L" : "D"}
                        </span>
                        <span className="shrink-0">{dish.emoji}</span>
                        <span className="text-foreground font-medium">{dish.name}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {filteredPlan.length === 0 && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              No meals found for "{tableSearch}"
            </div>
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block rounded-xl border border-border/60 overflow-hidden bg-card">
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-border/50 bg-secondary/80 backdrop-blur-sm">
                  <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground w-20">Day</th>
                  <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Breakfast</th>
                  <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Lunch</th>
                  <th className="px-4 py-2.5 text-left text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">Dinner</th>
                  <th className="px-4 py-2.5 text-right text-[11px] uppercase tracking-wider font-semibold text-muted-foreground w-20">kcal</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlan.map((d, idx) => {
                  const kcal = dayKcal([d.breakfast, d.lunch, d.dinner]);
                  const isToday = d.day === dayIdx;
                  return (
                    <tr
                      key={d.day}
                      className={
                        (idx > 0 ? "border-t border-border/30 " : "") +
                        (isToday
                          ? "bg-primary/[0.06] dark:bg-primary/[0.1]"
                          : "hover:bg-secondary/30") +
                        " transition-colors"
                      }
                    >
                      <td className="px-4 py-2.5 font-medium text-foreground whitespace-nowrap">
                        {isToday ? (
                          <span className="text-primary font-semibold">{d.day + 1} · today</span>
                        ) : (
                          <span className="text-muted-foreground">{d.day + 1}</span>
                        )}
                      </td>
                      {(["breakfast", "lunch", "dinner"] as const).map((slot) => (
                        <td
                          key={slot}
                          className="px-4 py-2.5 cursor-grab active:cursor-grabbing hover:bg-secondary/50 rounded transition-colors select-none"
                          draggable
                          onDragStart={(e) => handleDragStart(e, d.day, slot, d[slot])}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, d.day, slot)}
                        >
                          <span className="mr-1.5">{DISHES_BY_ID[d[slot]]?.emoji}</span>
                          <span className="text-foreground/90">{DISHES_BY_ID[d[slot]]?.name}</span>
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground font-medium">
                        {kcal}
                      </td>
                    </tr>
                  );
                })}
                {filteredPlan.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center py-10 text-muted-foreground text-sm">
                      No meals found for "{tableSearch}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>
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
                className="h-32 flex flex-col items-center justify-center p-4 gap-1.5 text-lg font-semibold hover:border-primary/50 group cursor-pointer whitespace-normal"
              >
                <Shuffle className="h-6 w-6 text-muted-foreground group-hover:text-primary shrink-0" />
                <span>Shuffle Next 7 Days</span>
                <span className="text-xs font-normal text-muted-foreground text-center leading-relaxed">
                  Only shuffle meals for the upcoming week cycle
                </span>
              </Button>
              <Button
                variant="outline"
                onClick={() => startShuffle("full")}
                className="h-32 flex flex-col items-center justify-center p-4 gap-1.5 text-lg font-semibold hover:border-primary/50 group cursor-pointer whitespace-normal"
              >
                <Shuffle className="h-6 w-6 text-muted-foreground group-hover:text-primary shrink-0" />
                <span>Shuffle Full Cycle ({formatCycleDuration(length)})</span>
                <span className="text-xs font-normal text-muted-foreground text-center leading-relaxed">
                  Re-rotate and shuffle all meals in your {length}-day rotation
                </span>
              </Button>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-4 my-4 pr-2 max-h-[50vh]">
              {/* Solver quality feedback */}
              {solverResult && (
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium ${
                    solverResult.score >= 80 ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                    : solverResult.score >= 50 ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
                    : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                  }`}>
                    {solverResult.score >= 80 ? "✓" : solverResult.score >= 50 ? "⚠" : "✗"}
                    {solverResult.score}% quality
                  </span>

                  {solverResult.relaxed.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 font-medium cursor-pointer hover:bg-amber-200/80 transition-colors border-0 text-xs select-none"
                        >
                          ⚡ {solverResult.relaxed.length} rule{solverResult.relaxed.length > 1 ? "s" : ""} relaxed
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="start" className="w-80 space-y-2 p-3 text-xs shadow-lg border border-amber-200 dark:border-amber-900/50">
                        <div className="font-semibold text-amber-700 dark:text-amber-400">
                          Relaxed Rules ({solverResult.relaxed.length})
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          These constraints were softened by the solver to find a solution:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-foreground/90 font-medium">
                          {solverResult.relaxed.map((id) => {
                            const rule = customRules.find((r) => r.id === id);
                            return <li key={id}>{rule?.label ?? id}</li>;
                          })}
                        </ul>
                      </PopoverContent>
                    </Popover>
                  )}

                  {solverResult.violations.length > 0 && (
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 font-medium cursor-pointer hover:bg-red-200/80 transition-colors border-0 text-xs select-none"
                        >
                          {solverResult.violations.length} violation{solverResult.violations.length > 1 ? "s" : ""}
                        </button>
                      </PopoverTrigger>
                      <PopoverContent side="bottom" align="start" className="w-80 space-y-2 p-3 text-xs shadow-lg border border-red-200 dark:border-red-900/50">
                        <div className="font-semibold text-red-600 dark:text-red-400">
                          Rule Violations ({solverResult.violations.length})
                        </div>
                        <p className="text-muted-foreground text-[11px]">
                          The plan currently violates the following rules:
                        </p>
                        <ul className="list-disc list-inside space-y-1 text-foreground/90 font-medium">
                          {solverResult.violations.map((id) => {
                            const rule = customRules.find((r) => r.id === id);
                            return <li key={id}>{rule?.label ?? id}</li>;
                          })}
                        </ul>
                      </PopoverContent>
                    </Popover>
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
      <SearchPlannerDialog
        open={isSearchPlannerOpen}
        onOpenChange={setIsSearchPlannerOpen}
        defaultDayIdx={dayIdx}
      />
    </div>
  );
}