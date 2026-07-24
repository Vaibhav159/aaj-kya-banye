import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DISHES, DISHES_BY_ID, dishesForSlot, type Dish, type Slot, CUISINE_LABELS, getDishBase, getDishBadges } from "@/lib/dishes";
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
import { Heart, Sparkles, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";

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

function CompanionCard({
  totals,
  profile,
  ruleChecks,
}: {
  totals: { kcal: number; protein: number; carbs: number; fat: number };
  profile: Profile;
  ruleChecks: ReturnType<typeof checkDay>;
}) {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 17 ? "Good Afternoon" : "Good Evening";

  const proteinDeficit = profile.goalProtein - totals.protein;
  const kcalHeadroom = profile.goalKcal - totals.kcal;
  const failedRules = ruleChecks.filter((c) => !c.passed);

  const kcalScore = Math.max(0, 100 - Math.abs((totals.kcal / profile.goalKcal) - 1) * 100);
  const proteinScore = Math.min(100, (totals.protein / profile.goalProtein) * 100);
  const rulesScore = ruleChecks.length ? (ruleChecks.filter((c) => c.passed).length / ruleChecks.length) * 100 : 100;
  const rawScore = (kcalScore * 0.35 + proteinScore * 0.4 + rulesScore * 0.25) / 10;
  const companionScore = Math.min(10, Math.max(1, Math.round(rawScore * 10) / 10));

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 via-background to-secondary/30 p-5 shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-4 w-4" />
            <span>Intelligent Meal Companion</span>
          </div>
          <h2 className="font-display text-2xl font-bold mt-1">
            {greeting}, {profile.name}
          </h2>
        </div>
        <div className="flex items-center gap-3">
          <div className="rounded-2xl border border-primary/20 bg-background/80 px-4 py-2 text-center backdrop-blur shadow-xs">
            <div className="font-display text-2xl font-extrabold text-primary">{companionScore} / 10</div>
            <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Today's Score</div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">What's missing today?</h3>
          <div className="space-y-1.5 text-xs sm:text-sm">
            {proteinDeficit > 15 ? (
              <div className="flex items-start gap-2 text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Protein is low ({totals.protein}g / {profile.goalProtein}g)</span>
                  <p className="text-[11px] opacity-90 mt-0.5">You are {proteinDeficit}g short of your protein target.</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Protein target achieved ({totals.protein}g / {profile.goalProtein}g)</span>
              </div>
            )}

            {kcalHeadroom >= 150 ? (
              <div className="flex items-start gap-2 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Room for a light snack (~{kcalHeadroom} kcal)</span>
                  <p className="text-[11px] opacity-90 mt-0.5">{totals.kcal} / {profile.goalKcal} kcal consumed.</p>
                </div>
              </div>
            ) : kcalHeadroom < -150 ? (
              <div className="flex items-center gap-2 text-rose-700 dark:text-rose-300 bg-rose-500/10 p-2.5 rounded-lg border border-rose-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>150+ kcal over daily target ({totals.kcal} / {profile.goalKcal} kcal)</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>Calorie intake perfectly balanced</span>
              </div>
            )}

            {failedRules.length > 0 ? (
              <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{failedRules.length} rule violation(s) detected today</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 p-2.5 rounded-lg border border-emerald-500/20">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>All active nutrition rules passing</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground font-semibold">Recommended Actions</h3>
          <div className="space-y-2">
            {proteinDeficit > 15 && (
              <Link to="/snacks" className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:bg-secondary/50 transition-colors group">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-base">🥛</span>
                  <div>
                    <div className="font-semibold text-foreground">Add Whey Shake / Greek Yogurt</div>
                    <div className="text-[11px] text-muted-foreground">+25g protein · Fits calorie headroom</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {kcalHeadroom >= 150 && (
              <Link to="/snacks" className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-background hover:bg-secondary/50 transition-colors group">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-base">🌰</span>
                  <div>
                    <div className="font-semibold text-foreground">Roasted Makhana / Sprouts Salad</div>
                    <div className="text-[11px] text-muted-foreground">~150 kcal · Healthy crunch</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {failedRules.length > 0 && (
              <Link to="/rules" className="flex items-center justify-between p-2.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 transition-colors group">
                <div className="flex items-center gap-2 text-xs font-medium">
                  <span className="text-base">⚡</span>
                  <div>
                    <div className="font-semibold text-foreground">Fix Rule Warnings</div>
                    <div className="text-[11px] text-muted-foreground">Automated meal replacement recommendations</div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {proteinDeficit <= 15 && kcalHeadroom < 150 && failedRules.length === 0 && (
              <div className="p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 text-xs text-emerald-800 dark:text-emerald-200">
                🎉 Excellent meal day! Your meals are well balanced according to your macro goals and custom nutrition rules.
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

function Dashboard() {
  const { profile } = useProfile();
  const { start, length } = useCycleStart();
  const { overrides, setOne } = useOverrides();
  const { log, setEntry } = useMealLog();
  const { rules: customRules } = useCustomRules();
  const dayIdx = currentDayIndex(start, Date.now(), length);
  const plan = useMemo(() => applyOverrides(overrides, length), [overrides, length]);
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
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Day {dayIdx + 1} of {length}</p>
          <h1 className="font-display text-4xl font-semibold">Today's Meals</h1>
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

      <CompanionCard totals={totals} profile={profile} ruleChecks={ruleChecks} />

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
              <h2 className="font-display text-xl font-semibold truncate">{dish.name}</h2>
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
            <Badge variant="default" className="text-[10px] bg-amber-950 text-amber-50 dark:bg-amber-900/50 dark:text-amber-200 py-0 border border-amber-800 dark:border-amber-700/60">
              🗺️ {cuisineName}
            </Badge>
          )}
          <Badge variant="secondary" className="text-[10px] font-medium py-0">
            🍞 {base}
          </Badge>
          {getDishBadges(dish).map((badge, idx) => (
            <Badge
              key={idx}
              variant="outline"
              className={`text-[10px] py-0 ${
                badge.variant === "protein"
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                  : badge.variant === "light"
                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/30"
                    : badge.variant === "airfryer"
                      ? "bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/30"
                      : badge.variant === "paneer"
                        ? "bg-orange-500/10 text-orange-700 dark:text-orange-300 border-orange-500/30"
                        : ""
              }`}
            >
              {badge.label}
            </Badge>
          ))}
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
          <div className="flex-1 space-y-2.5">
            <MacroBar
              label="Calories"
              value={totals.kcal}
              goal={profile.goalKcal}
              unit="kcal"
              color="var(--color-chart-1)"
              note={profile.goalKcal - totals.kcal > 0 ? `${profile.goalKcal - totals.kcal} kcal room remaining` : 'Target reached'}
            />
            <MacroBar
              label="Protein"
              value={totals.protein}
              goal={profile.goalProtein}
              unit="g"
              color="var(--color-primary)"
              note={profile.goalProtein - totals.protein > 0 ? `${profile.goalProtein - totals.protein}g short of protein target` : 'Protein goal hit! 🎉'}
            />
            <MacroBar
              label="Carbs"
              value={totals.carbs}
              goal={profile.goalCarbs}
              unit="g"
              color="var(--color-accent)"
              note={totals.carbs > profile.goalCarbs ? `${totals.carbs - profile.goalCarbs}g over limit` : `${profile.goalCarbs - totals.carbs}g remaining`}
            />
            <MacroBar
              label="Fat"
              value={totals.fat}
              goal={profile.goalFat}
              unit="g"
              color="var(--color-success)"
              note={profile.goalFat - totals.fat > 0 ? `${profile.goalFat - totals.fat}g remaining` : 'Balanced'}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function MacroBar({ label, value, goal, unit = "g", color, note }: { label: string; value: number; goal: number; unit?: string; color: string; note?: string }) {
  const pct = Math.min(100, Math.round((value / goal) * 100));
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs sm:text-sm">
        <span className="text-foreground font-medium">{label}</span>
        <span className="text-muted-foreground">{value}{unit} / {goal}{unit}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, background: color }} />
      </div>
      {note && <div className="text-[10px] text-muted-foreground mt-0.5">{note}</div>}
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
    <Card className="flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="font-display text-xl sm:text-2xl">Rule Tracker</CardTitle>
        <Link to="/rules" className="text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
          Manage →
        </Link>
      </CardHeader>
      <CardContent className="flex-1 space-y-1.5 max-h-[310px] overflow-y-auto pr-1">
        {enabledCustomRules.map((rule) => {
          const c = checks.find((x) => x.id === rule.id);
          if (!c) return null;
          return (
            <div
              key={rule.id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/50 bg-secondary/20 px-3 py-2 transition-colors hover:bg-secondary/40"
            >
              <div className="min-w-0 flex-1">
                <div className="text-xs sm:text-sm font-medium leading-tight text-foreground truncate">{rule.label}</div>
                <div className="text-[11px] text-muted-foreground capitalize leading-tight mt-0.5">
                  {rule.kind.replace(/-/g, " ")} · {rule.scope}
                </div>
              </div>
              <RuleBadgePopover rule={rule} check={c} dayPlan={dayPlan} weekPlan={weekPlan} />
            </div>
          );
        })}
        {enabledCustomRules.length === 0 && (
          <p className="text-sm text-muted-foreground py-6 text-center">
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
          aria-label={`Rule status: ${rule.label} - ${check.passed ? "Passed" : "Violated"}`}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onClick={() => setOpen((prev) => !prev)}
          className={`shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium border cursor-pointer hover:opacity-80 transition-opacity select-none ${
            check.passed
              ? "bg-emerald-100 text-emerald-900 border-emerald-300 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-700/60"
              : "bg-rose-100 text-rose-900 border-rose-300 dark:bg-rose-950/70 dark:text-rose-300 dark:border-rose-700/60"
          }`}
        >
          <span className="font-semibold">{check.passed ? "✓" : "!"}</span>
          <span>{check.detail}</span>
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
      .filter(
        (d) =>
          d.name.toLowerCase().includes(query) ||
          (d.cuisine && d.cuisine.toLowerCase().includes(query)) ||
          d.tags.some((t) => t.toLowerCase().includes(query))
      )
      .map((d) => ({
        dish: d,
        passesRules: isSwapAllowed(d, slot, dayIdx, plan, customRules),
      }))
      .slice(0, 15);
  }, [q, allDishes, current.id, slot, dayIdx, plan, customRules]);

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search all dishes to swap..."
        value={q}
        onChange={(e) => setQ(e.target.value)}
        className="w-full"
      />

      {q.trim() === "" ? (
        <div className="space-y-2">
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Smart Suggestions (±150 kcal)</h3>
          {smartCandidates.length === 0 ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">No swap candidates match all your rules within ±150 kcal.</p>
              <p className="text-xs text-muted-foreground">Try searching above — you can search and select any dish even if it doesn't meet all rules.</p>
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
          <h3 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold">Search Results ({searchResults.length})</h3>
          {searchResults.length === 0 ? (
            <p className="text-sm text-muted-foreground">No dishes matching "{q}".</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {searchResults.map(({ dish: d, passesRules }) => (
                <button
                  key={d.id}
                  onClick={() => onPick(d.id)}
                  className="group flex items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition hover:border-primary hover:bg-secondary/40"
                >
                  <span className="text-3xl">{d.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <div className="truncate font-medium">{d.name}</div>
                      {!passesRules && (
                        <span className="shrink-0 rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                          Breaks rules
                        </span>
                      )}
                    </div>
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
  const cycleLen = plan.length || 42;
  const days = Array.from({ length: 7 }, (_, i) => (((todayIdx - (6 - i)) % cycleLen) + cycleLen) % cycleLen);
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="font-display text-2xl">Last 7 days</CardTitle>
        <Link to="/history" className="text-sm font-medium text-primary hover:underline">See history →</Link>
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
