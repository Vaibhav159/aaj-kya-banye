import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DISHES, DISHES_BY_ID, getDishBase, CUISINE_LABELS, type Dish, type Slot } from "@/lib/dishes";
import { useCustomDishes, useOverrides, applyOverrides, currentDayIndex, useCycleStart } from "@/lib/store";
import { useCustomRules } from "@/lib/custom-rules";
import { checkDay } from "@/lib/rules";
import { Search, Sparkles, Plus, Calendar, Check, Flame, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { DishDetailDialog } from "./dish-detail";

interface SearchPlannerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDayIdx?: number;
  defaultSlot?: Slot;
}

export function SearchPlannerDialog({
  open,
  onOpenChange,
  defaultDayIdx,
  defaultSlot = "breakfast",
}: SearchPlannerDialogProps) {
  const { start, length } = useCycleStart();
  const todayIdx = currentDayIndex(start, Date.now(), length);
  
  const [query, setQuery] = useState("");
  const [selectedSlot, setSelectedSlot] = useState<Slot>(defaultSlot);
  const [targetDay, setTargetDay] = useState<number>(defaultDayIdx ?? todayIdx);
  const [selectedDish, setSelectedDish] = useState<Dish | null>(null);
  const [detailDish, setDetailDish] = useState<Dish | null>(null);

  const { dishes: customDishes } = useCustomDishes();
  const { overrides, setOne } = useOverrides();
  const { rules: customRules } = useCustomRules();

  const plan = useMemo(() => applyOverrides(overrides, length), [overrides, length]);

  const allDishes = useMemo(() => {
    const map = new Map<string, Dish>();
    DISHES.forEach((d) => map.set(d.id, d));
    customDishes.forEach((d) => map.set(d.id, d));
    return Array.from(map.values());
  }, [customDishes]);

  // Filter pool by slot, query, base, cuisine
  const filteredDishes = useMemo(() => {
    return allDishes.filter((d) => {
      // Must support selected slot
      if (!d.slots.includes(selectedSlot)) return false;
      if (!query.trim()) return true;

      const q = query.toLowerCase().trim();
      const matchName = d.name.toLowerCase().includes(q);
      const matchCuisine = d.cuisine?.toLowerCase().includes(q);
      const matchTags = d.tags.some((t) => t.toLowerCase().includes(q));
      const matchIng = d.ingredients.some((i) => i.name.toLowerCase().includes(q));
      return matchName || matchCuisine || matchTags || matchIng;
    });
  }, [allDishes, selectedSlot, query]);

  // Current dish at target position
  const currentTargetDishId = plan[targetDay]?.[selectedSlot];
  const currentTargetDish = currentTargetDishId ? DISHES_BY_ID[currentTargetDishId] : null;

  // Check rule issues for proposed replacement
  const ruleCheck = useMemo(() => {
    if (!selectedDish) return null;
    const testOverrides = { ...overrides, [`d${targetDay}-${selectedSlot}`]: selectedDish.id };
    const testPlan = applyOverrides(testOverrides, length);
    const dayResult = checkDay(testPlan, targetDay, customRules);
    return dayResult;
  }, [selectedDish, targetDay, selectedSlot, overrides, customRules, length]);

  const handleAssign = (dish: Dish) => {
    setOne(targetDay, selectedSlot, dish.id);
    toast.success(`Set ${dish.name} for Day ${targetDay + 1} (${selectedSlot})`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-display flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Search & Assign Meal
          </DialogTitle>
          <DialogDescription className="text-xs">
            Find any dish from the full catalog and place it into your rotation.
          </DialogDescription>
        </DialogHeader>

        {/* Target Position Selection Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-secondary/50 rounded-xl border border-border/60 my-2">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Target Day</label>
            <Select
              value={String(targetDay)}
              onValueChange={(val) => setTargetDay(Number(val))}
            >
              <SelectTrigger className="h-9 bg-background">
                <SelectValue placeholder="Select Day" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {Array.from({ length }, (_, i) => (
                  <SelectItem key={i} value={String(i)}>
                    Day {i + 1} {i === todayIdx ? " (Today)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Meal Slot</label>
            <div className="grid grid-cols-3 gap-1">
              {(["breakfast", "lunch", "dinner"] as const).map((s) => (
                <Button
                  key={s}
                  type="button"
                  size="sm"
                  variant={selectedSlot === s ? "default" : "outline"}
                  onClick={() => setSelectedSlot(s)}
                  className="capitalize text-xs h-9 cursor-pointer"
                >
                  {s}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Current dish preview */}
        {currentTargetDish && (
          <div className="flex items-center justify-between text-xs px-3 py-2 bg-muted/40 rounded-lg border border-border/40">
            <span className="text-muted-foreground">Current Day {targetDay + 1} {selectedSlot}:</span>
            <span className="font-medium flex items-center gap-1.5">
              <span>{currentTargetDish.emoji}</span>
              <span>{currentTargetDish.name}</span>
              <span className="text-muted-foreground">({currentTargetDish.kcal} kcal)</span>
            </span>
          </div>
        )}

        {/* Search input */}
        <div className="relative mt-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={`Search ${selectedSlot} dishes by name, cuisine, ingredients...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9 h-10 rounded-xl"
            autoFocus
          />
        </div>

        {/* Search Results Pool */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 my-2 max-h-[40vh]">
          {filteredDishes.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No matching dishes found for {selectedSlot}. Try a different search term!
            </div>
          ) : (
            filteredDishes.map((dish) => {
              const isSelected = selectedDish?.id === dish.id;
              const isCurrent = currentTargetDishId === dish.id;
              const base = getDishBase(dish);
              return (
                <div
                  key={dish.id}
                  onClick={() => setSelectedDish(dish)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 ${
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs"
                      : isCurrent
                      ? "border-muted bg-muted/20 opacity-70"
                      : "border-border/70 hover:border-primary/50 hover:bg-secondary/40"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl p-2 rounded-lg bg-background border border-border/40 shrink-0">
                      {dish.emoji}
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm truncate">{dish.name}</span>
                        {dish.cuisine && (
                          <Badge variant="outline" className="text-[10px] py-0 h-4">
                            {CUISINE_LABELS[dish.cuisine]}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-[10px] py-0 h-4">
                          {base}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                        <span className="flex items-center gap-1 font-medium text-primary">
                          <Flame className="h-3 w-3" /> {dish.kcal} kcal
                        </span>
                        <span>·</span>
                        <span>P: {dish.protein}g</span>
                        <span>·</span>
                        <span>C: {dish.carbs}g</span>
                        <span>·</span>
                        <span>F: {dish.fat}g</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-auto sm:ml-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailDish(dish);
                      }}
                      className="text-xs h-8 px-2 cursor-pointer"
                    >
                      Recipe
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={isCurrent}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAssign(dish);
                      }}
                      className="text-xs h-8 px-3 gap-1 bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
                    >
                      {isCurrent ? (
                        <>Current</>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" /> Plan Dish
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Selected Dish Rule Compliance Banner */}
        {selectedDish && ruleCheck && (() => {
          const failures = ruleCheck.filter((c) => !c.passed);
          return (
            <div className="p-3 rounded-xl bg-secondary/60 border border-border text-xs space-y-1">
              <div className="flex items-center justify-between font-semibold">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-amber-500" /> Rule Compliance for Day {targetDay + 1}
                </span>
                <span className={failures.length === 0 ? "text-emerald-600 font-bold" : "text-amber-600 font-bold"}>
                  {failures.length === 0 ? "✓ 100% Compliant" : `⚠ ${failures.length} Warning(s)`}
                </span>
              </div>
              {failures.length > 0 && (
                <ul className="text-muted-foreground space-y-0.5 pt-1 pl-4 list-disc text-[11px]">
                  {failures.map((c, idx) => (
                    <li key={idx}>{c.detail}</li>
                  ))}
                </ul>
              )}
            </div>
          );
        })()}

        <DishDetailDialog
          dish={detailDish}
          open={detailDish !== null}
          onOpenChange={(o) => !o && setDetailDish(null)}
        />
      </DialogContent>
    </Dialog>
  );
}
