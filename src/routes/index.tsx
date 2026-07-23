import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DISHES, DISHES_BY_ID, dishesForSlot, type Dish, type Slot, CUISINE_LABELS, getDishBase } from "@/lib/dishes";
import {
  applyOverrides,
  computeStreak,
  currentDayIndex,
  logKey,
  useCycleStart,
  useMealLog,
  useOverrides,
  useProfile,
  useCustomDishes,
  useFavorites,
  getMealDisplayStatus,
  type Profile,
} from "@/lib/store";
import { Heart } from "lucide-react";

import { checkDay, isSwapAllowed, RULES } from "@/lib/rules";
import { DishDetailDialog } from "@/components/dish-detail";
import { shareOrCopy, todaySummary } from "@/lib/share";
import { toast } from "sonner";
import { useCustomRules, dishMatches, type CustomRule } from "@/lib/custom-rules";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { type DayPlan } from "@/lib/plan";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today's Indian Vegetarian Meals & Macro Tracker · Aaj Kya Banaye?" },
      { name: "description", content: "View today's curated Indian vegetarian breakfast, lunch, and dinner with real-time calorie and macro breakdown, meal logging, and one-tap swaps." },
      { property: "og:title", content: "Today's Meals & Macros · Aaj Kya Banaye?" },
      { property: "og:description", content: "Interactive daily Indian vegetarian meal planner with calorie and macro tracking." },
    ],
  }),
  component: Dashboard,
});

const SLOTS: Slot[] = ["breakfast", "lunch", "dinner"];
const SLOT_META: Record<Slot, { label: string; emoji: string; time: string }> = {
  breakfast: { label: "Breakfast", emoji: "🌅", time: "8:00 AM" },
  lunch: { label: "Lunch", emoji: "🍛", time: "1:00 PM" },
  dinner: { label: "Dinner", emoji: "🌙", time: "8:00 PM" },
};

function Dashboard() {
  const { profile } = useProfile();
  const { start } = useCycleStart();
  const { overrides, setOne } = useOverrides();
  const { log, setEntry } = useMealLog();
  const { rules: customRules } = useCustomRules();
  const dayIdx = currentDayIndex(start);
  const plan = useMemo(() => applyOverrides(overrides), [overrides]);
  const today = plan[dayIdx];

  const [swapSlot, setSwapSlot] = useState<Slot | null>(null);
  const [detail, setDetail] = useState<Dish | null>(null);

  const dishes = SLOTS.map((s) => DISHES_BY_ID[today[s]]);
  const totals = dishes.reduce(
    (acc, d) => ({
      kcal: acc.kcal + d.kcal,
      protein: acc.protein + d.protein,
      carbs: acc.carbs + d.carbs,
      fat: acc.fat + d.fat,
    }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );

  const ruleChecks = checkDay(plan, dayIdx, customRules);
  const streak = computeStreak(log, start, dayIdx);

  const onShare = async () => {
    const res = await shareOrCopy("Today · Aaj Kya Banaye?", todaySummary(today, dayIdx));
    if (res === "copied") toast.success("Copied plan to clipboard");
    else if (res === "failed") toast.error("Could not share");
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Day {dayIdx + 1} of 42</p>
          <h1 className="font-display text-4xl font-semibold">Hello, {profile.name}</h1>
          <p className="mt-1 text-muted-foreground">
            Here's what you're eating today.
            {streak > 0 && <> · 🔥 <span className="font-medium text-foreground">{streak}-day streak</span></>}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-sm">
            {totals.kcal} / {profile.goalKcal} kcal
          </Badge>
          <Button size="sm" variant="outline" onClick={onShare}>Share</Button>
        </div>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        {SLOTS.map((slot, i) => (
          <MealCard
            key={slot}
            slot={slot}
            dish={dishes[i]}
            onSwap={() => setSwapSlot(slot)}
            onDetails={() => setDetail(dishes[i])}
            status={log[logKey(start, dayIdx, slot)]?.status}
            onToggle={(status) => setEntry(logKey(start, dayIdx, slot), status)}
          />
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <NutritionCard totals={totals} profile={profile} />
        <RulesCard
          checks={ruleChecks}
          customRules={customRules}
          dayPlan={today}
          weekPlan={useMemo(() => {
            const ws = Math.floor(dayIdx / 7) * 7;
            return plan.slice(ws, ws + 7);
          }, [plan, dayIdx])}
        />
      </div>

      <RecentStrip log={log} start={start} plan={plan} todayIdx={dayIdx} profile={profile} />

      <Dialog open={swapSlot !== null} onOpenChange={(o) => !o && setSwapSlot(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Swap {swapSlot && SLOT_META[swapSlot].label}</DialogTitle>
          </DialogHeader>
          {swapSlot && (
            <SwapList
              slot={swapSlot}
              dayIdx={dayIdx}
              plan={plan}
              customRules={customRules}
              onPick={(id) => {
                setOne(dayIdx, swapSlot, id);
                setSwapSlot(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      <DishDetailDialog dish={detail} open={detail !== null} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  );
}

function MealCard({
  slot,
  dish,
  onSwap,
  onDetails,
  status,
  onToggle,
}: {
  slot: Slot;
  dish: Dish;
  onSwap: () => void;
  onDetails: () => void;
  status: "eaten" | "skipped" | undefined;
  onToggle: (s: "eaten" | "skipped" | null) => void;
}) {
  const meta = SLOT_META[slot];
  const { isFavorite, toggleFavorite } = useFavorites();
  const fav = isFavorite(dish.id);
  const base = getDishBase(dish);
  const cuisineName = dish.cuisine ? CUISINE_LABELS[dish.cuisine] : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
          <span>{meta.emoji}</span> {meta.label}
        </div>
        <span className="text-xs text-muted-foreground">{meta.time}</span>
      </div>
      <CardContent className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <button onClick={onDetails} className="flex flex-1 items-start gap-3 text-left min-w-0">
            <span className="text-4xl leading-none shrink-0">{dish.emoji}</span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-xl font-semibold truncate">{dish.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{dish.kcal} kcal · tap for details</p>
            </div>
          </button>
          <button
            onClick={() => toggleFavorite(dish.id)}
            className={`p-1.5 rounded-full transition-colors ${fav ? "text-rose-600 bg-rose-50 dark:bg-rose-950/30" : "text-muted-foreground hover:text-rose-500"}`}
            title={fav ? "Remove favorite" : "Mark favorite"}
          >
            <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5 items-center">
          {cuisineName && (
            <Badge variant="default" className="text-[10px] bg-amber-600 dark:bg-amber-700 py-0">
              🗺️ {cuisineName}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] font-medium py-0">
            🍞 {base}
          </Badge>
          {dish.prepMinutes && (
            <Badge variant="outline" className="text-[10px] py-0">
              ⏱ {dish.prepMinutes}m
            </Badge>
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 text-center text-xs">
          <Macro label="Protein" value={dish.protein} />
          <Macro label="Carbs" value={dish.carbs} />
          <Macro label="Fat" value={dish.fat} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <Button
            variant={status === "eaten" ? "default" : "outline"}
            size="sm"
            onClick={() => onToggle(status === "eaten" ? null : "eaten")}
          >
            {status === "eaten" ? "✓ Eaten" : "Ate it"}
          </Button>
          <Button
            variant={status === "skipped" ? "secondary" : "outline"}
            size="sm"
            onClick={() => onToggle(status === "skipped" ? null : "skipped")}
          >
            {status === "skipped" ? "Skipped" : "Skip"}
          </Button>
          <Button variant="outline" size="sm" onClick={onSwap}>Swap</Button>
        </div>
      </CardContent>
    </Card>
  );
}


function Macro({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted px-2 py-2">
      <div className="text-sm font-semibold text-foreground">{value}g</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}

function NutritionCard({
  totals,
  profile,
}: {
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  profile: { goalKcal: number; goalProtein: number; goalCarbs: number; goalFat: number };
}) {
  const pct = Math.min(100, Math.round((totals.kcal / profile.goalKcal) * 100));
  const R = 60;
  const C = 2 * Math.PI * R;
  const dash = (pct / 100) * C;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Daily Nutrition</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-6">
          <svg viewBox="0 0 160 160" className="h-40 w-40 -rotate-90">
            <circle cx="80" cy="80" r={R} fill="none" stroke="var(--color-muted)" strokeWidth="14" />
            <circle
              cx="80"
              cy="80"
              r={R}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="14"
              strokeDasharray={C}
              strokeDashoffset={C - dash}
              strokeLinecap="round"
            />
            <text
              x="80"
              y="85"
              textAnchor="middle"
              className="fill-foreground font-display text-2xl font-bold rotate-90 origin-center"
            >
              {pct}%
            </text>
          </svg>
          <div className="flex-1 space-y-3">
            <MacroBar label="Protein" value={totals.protein} goal={profile.goalProtein} color="var(--color-primary)" />
            <MacroBar label="Carbs" value={totals.carbs} goal={profile.goalCarbs} color="var(--color-accent)" />
            <MacroBar label="Fat" value={totals.fat} goal={profile.goalFat} color="var(--color-success)" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MacroBar({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="text-foreground">{label}</span>
        <span className="text-muted-foreground">{value}g / {goal}g</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  );
}

function RulesCard({
  checks,
  customRules,
  dayPlan,
  weekPlan,
}: {
  checks: ReturnType<typeof checkDay>;
  customRules: CustomRule[];
  dayPlan: DayPlan;
  weekPlan: DayPlan[];
}) {
  const enabledCustomRules = customRules.filter((r) => r.enabled);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Rule Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
        {enabledCustomRules.map((rule) => {
          const c = checks.find((x) => x.id === rule.id);
          if (!c) return null;
          return (
            <div key={rule.id} className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-secondary/30 p-3">
              <div>
                <div className="text-sm font-medium">{rule.label}</div>
                <div className="text-xs text-muted-foreground capitalize">{rule.kind.replace(/-/g, " ")} · {rule.scope}</div>
              </div>
              <RuleBadgePopover rule={rule} check={c} dayPlan={dayPlan} weekPlan={weekPlan} />
            </div>
          );
        })}
        {enabledCustomRules.length === 0 && (
          <p className="text-sm text-muted-foreground p-3 text-center">
            No rules active. Configure them in settings.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function RuleBadgePopover({
  rule,
  check,
  dayPlan,
  weekPlan,
}: {
  rule: CustomRule;
  check: import("@/lib/rules").RuleCheck;
  dayPlan: DayPlan;
  weekPlan: DayPlan[];
}) {
  const [open, setOpen] = useState(false);

  const slotsToCheck: Slot[] = rule.scope === "any" ? ["breakfast", "lunch", "dinner"] : [rule.scope];

  const matchingWeekItems = useMemo(() => {
    if (rule.kind !== "min-frequency" && rule.kind !== "max-frequency") return [];
    const items: { day: number; slot: Slot; dish: Dish }[] = [];
    weekPlan.forEach((d) => {
      slotsToCheck.forEach((s) => {
        const dish = DISHES_BY_ID[d[s]];
        if (dish && dishMatches(dish, rule.match)) {
          items.push({ day: d.day, slot: s, dish });
        }
      });
    });
    return items;
  }, [rule, weekPlan, slotsToCheck]);

  const todaySlotItems = useMemo(() => {
    return slotsToCheck.map((s) => {
      const dish = DISHES_BY_ID[dayPlan[s]];
      const matches = dish ? dishMatches(dish, rule.match) : false;
      return { slot: s, dish, matches };
    });
  }, [rule, dayPlan, slotsToCheck]);

  const lunchDish = DISHES_BY_ID[dayPlan.lunch];
  const dinnerDish = DISHES_BY_ID[dayPlan.dinner];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen((prev) => !prev)}
          className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium border-0 cursor-pointer hover:opacity-80 transition-opacity select-none ${
            check.passed
              ? "bg-success/15 text-success dark:bg-green-900/30 dark:text-green-400"
              : "bg-destructive/15 text-destructive dark:bg-red-900/30 dark:text-red-400"
          }`}
          style={{ color: check.passed ? "var(--color-success)" : "var(--color-destructive)" }}
        >
          {check.passed ? "✓" : "!"} {check.detail}
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        className="w-72 sm:w-80 p-3 space-y-2 text-xs shadow-lg"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
      >
        <div className="font-semibold text-foreground border-b pb-1.5 flex items-center justify-between">
          <span>{rule.label}</span>
          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${check.passed ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"}`}>
            {check.passed ? "Passed" : "Violated"}
          </span>
        </div>

        {/* Weekly frequency rules */}
        {(rule.kind === "min-frequency" || rule.kind === "max-frequency") && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[11px]">
              Matches in current week ({matchingWeekItems.length} found, limit: {rule.match.frequencyLimit ?? 1}/week):
            </p>
            {matchingWeekItems.length === 0 ? (
              <p className="text-muted-foreground italic py-1 text-[11px]">No matching dishes this week.</p>
            ) : (
              <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
                {matchingWeekItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-secondary/40">
                    <span className="truncate font-medium flex items-center gap-1.5">
                      <span>{item.dish.emoji}</span>
                      <span className="truncate">{item.dish.name}</span>
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize shrink-0">
                      Day {item.day + 1} · {item.slot}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Avoid / Require / Prefer rules */}
        {(rule.kind === "avoid" || rule.kind === "require" || rule.kind === "prefer") && (
          <div className="space-y-1.5">
            <p className="text-muted-foreground text-[11px]">Today's meals status:</p>
            <div className="space-y-1">
              {todaySlotItems.map((item) => (
                <div key={item.slot} className="flex items-center justify-between gap-2 p-1.5 rounded-md bg-secondary/40">
                  <span className="truncate font-medium flex items-center gap-1.5">
                    <span>{item.dish?.emoji}</span>
                    <span className="truncate">{item.dish?.name ?? "None"}</span>
                  </span>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded capitalize shrink-0 ${
                    item.matches ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" : "bg-muted text-muted-foreground"
                  }`}>
                    {item.slot}: {item.matches ? "Matches" : "No match"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Lighter dinner rule */}
        {rule.kind === "lighter-dinner" && (
          <div className="space-y-1.5 text-muted-foreground">
            <div className="flex justify-between items-center p-1.5 rounded bg-secondary/40 text-foreground">
              <span className="flex items-center gap-1">☀️ Lunch: {lunchDish?.name}</span>
              <span className="font-semibold">{lunchDish?.kcal ?? 0} kcal</span>
            </div>
            <div className="flex justify-between items-center p-1.5 rounded bg-secondary/40 text-foreground">
              <span className="flex items-center gap-1">🌙 Dinner: {dinnerDish?.name}</span>
              <span className="font-semibold">{dinnerDish?.kcal ?? 0} kcal</span>
            </div>
          </div>
        )}

        {/* No repeat rule */}
        {rule.kind === "no-repeat" && (
          <p className="text-muted-foreground text-[11px]">
            {check.passed
              ? `No dishes repeat within ${rule.match.minDaysBetweenRepeat ?? 3} days of today.`
              : `One or more dishes in today's menu repeat within ${rule.match.minDaysBetweenRepeat ?? 3} days.`}
          </p>
        )}
      </PopoverContent>
    </Popover>
  );
}

function SwapList({
  slot,
  dayIdx,
  plan,
  customRules,
  onPick,
}: {
  slot: Slot;
  dayIdx: number;
  plan: ReturnType<typeof applyOverrides>;
  customRules: ReturnType<typeof useCustomRules>["rules"];
  onPick: (id: string) => void;
}) {
  const current = DISHES_BY_ID[plan[dayIdx][slot]];
  const { dishes: customDishes } = useCustomDishes();
  const [q, setQ] = useState("");

  const allDishes = useMemo(() => {
    const map = new Map<string, Dish>();
    DISHES.forEach((d) => map.set(d.id, d));
    customDishes.forEach((d) => map.set(d.id, d));
    return Array.from(map.values());
  }, [customDishes]);

  const smartCandidates = useMemo(() => {
    return allDishes
      .filter((d) => d.id !== current.id)
      .filter((d) => d.slots.includes(slot))
      .filter((d) => Math.abs(d.kcal - current.kcal) <= 150)
      .filter((d) => isSwapAllowed(d, slot, dayIdx, plan, customRules))
      .slice(0, 4);
  }, [allDishes, current.id, current.kcal, slot, dayIdx, plan, customRules]);

  const searchResults = useMemo(() => {
    if (!q.trim()) return [];
    const query = q.toLowerCase();
    return allDishes
      .filter((d) => d.id !== current.id)
      .filter((d) => d.slots.includes(slot))
      .filter((d) => isSwapAllowed(d, slot, dayIdx, plan, customRules))
      .filter((d) => d.name.toLowerCase().includes(query))
      .slice(0, 10);
  }, [q, allDishes, current.id, slot, dayIdx, plan, customRules]);

  return (
    <div className="space-y-4">
      <Input
        placeholder={`Search all ${slot} dishes to swap...`}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full"
      />

      {q.trim() === "" ? (
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Smart Suggestions (±150 kcal)</h4>
          {smartCandidates.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No swap candidates match all your rules within ±150 kcal.</p>
              <p className="text-xs text-muted-foreground">Try searching below — rule-incompatible dishes are filtered but you can still find options by name.</p>
            </div>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {smartCandidates.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onPick(d.id)}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-secondary/40"
                >
                  <span className="text-3xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.kcal} kcal · P {d.protein} · C {d.carbs} · F {d.fat}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Search Results ({searchResults.length})</h4>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dishes matching "{q}" pass rules.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {searchResults.map((d) => (
                <button
                  key={d.id}
                  onClick={() => onPick(d.id)}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-secondary/40"
                >
                  <span className="text-3xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="truncate font-medium">{d.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {d.kcal} kcal · P {d.protein} · C {d.carbs} · F {d.fat}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function RecentStrip({
  log,
  start,
  plan,
  todayIdx,
  profile,
}: {
  log: ReturnType<typeof useMealLog>["log"];
  start: number;
  plan: ReturnType<typeof applyOverrides>;
  todayIdx: number;
  profile: Profile;
}) {
  const slots: Slot[] = ["breakfast", "lunch", "dinner"];
  const days = Array.from({ length: 7 }, (_, i) => (((todayIdx - (6 - i)) % 42) + 42) % 42);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-2xl">Last 7 days</CardTitle>
        <Link to="/history" className="text-sm text-primary hover:underline">See history →</Link>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => (
            <div key={d} className={"space-y-0.5 text-center " + (d === todayIdx ? "font-semibold text-primary" : "")}>
              <div className="text-[10px] text-muted-foreground">D{d + 1}</div>
              <div className="flex flex-col gap-0.5">
                {slots.map((s) => {
                  const entry = log[logKey(start, d, s)];
                  const status = getMealDisplayStatus(entry, s, d, start, profile);
                  return (
                    <div
                      key={s}
                      title={`${DISHES_BY_ID[plan[d][s]]?.name} · ${status}`}
                      className={
                        "h-3 rounded-sm " +
                        (status === "eaten"
                          ? "bg-success"
                          : status === "delayed"
                            ? "bg-warning animate-pulse"
                            : status === "skipped"
                              ? "bg-destructive animate-pulse"
                              : "bg-border/60")
                      }
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
