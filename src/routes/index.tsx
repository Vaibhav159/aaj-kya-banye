import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { DISHES_BY_ID, dishesForSlot, type Dish, type Slot } from "@/lib/dishes";
import { applyOverrides, computeStreak, currentDayIndex, logKey, useCycleStart, useMealLog, useOverrides, useProfile } from "@/lib/store";
import { checkDay, isSwapAllowed, RULES } from "@/lib/rules";
import { DishDetailDialog } from "@/components/dish-detail";
import { shareOrCopy, todaySummary } from "@/lib/share";
import { toast } from "sonner";
import { useCustomRules } from "@/lib/custom-rules";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Today · Thali" },
      { name: "description", content: "Today's breakfast, lunch and dinner with real-time macros and one-tap swaps." },
      { property: "og:title", content: "Today · Thali" },
      { property: "og:description", content: "Today's Indian vegetarian meals with macros and swaps." },
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

  const ruleChecks = checkDay(plan, dayIdx);
  const streak = computeStreak(log, start, dayIdx);

  const onShare = async () => {
    const res = await shareOrCopy("Today · Thali", todaySummary(today, dayIdx));
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
        <RulesCard checks={ruleChecks} />
      </div>

      <RecentStrip log={log} start={start} plan={plan} todayIdx={dayIdx} />

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
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-secondary/60 px-5 py-3">
        <div className="flex items-center gap-2 text-sm font-medium text-secondary-foreground">
          <span>{meta.emoji}</span> {meta.label}
        </div>
        <span className="text-xs text-muted-foreground">{meta.time}</span>
      </div>
      <CardContent className="space-y-4 p-5">
        <button onClick={onDetails} className="flex w-full items-start gap-3 text-left">
          <span className="text-4xl leading-none">{dish.emoji}</span>
          <div>
            <h3 className="font-display text-xl font-semibold">{dish.name}</h3>
            <p className="text-sm text-muted-foreground">{dish.kcal} kcal · tap for details</p>
          </div>
        </button>
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
              strokeLinecap="round"
              strokeDasharray={`${dash} ${C - dash}`}
            />
          </svg>
          <div>
            <div className="font-display text-4xl font-semibold">{totals.kcal}</div>
            <div className="text-sm text-muted-foreground">of {profile.goalKcal} kcal · {pct}%</div>
          </div>
        </div>
        <div className="mt-6 space-y-3">
          <MacroBar label="Protein" value={totals.protein} goal={profile.goalProtein} color="var(--color-primary)" />
          <MacroBar label="Carbs" value={totals.carbs} goal={profile.goalCarbs} color="var(--color-accent)" />
          <MacroBar label="Fat" value={totals.fat} goal={profile.goalFat} color="var(--color-success)" />
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

function RulesCard({ checks }: { checks: ReturnType<typeof checkDay> }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display text-2xl">Rule Tracker</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {RULES.map((rule) => {
          const c = checks.find((x) => x.id === rule.id);
          return (
            <div key={rule.id} className="flex items-start justify-between gap-3 rounded-md border border-border/70 bg-secondary/30 p-3">
              <div>
                <div className="text-sm font-medium">{rule.label}</div>
                <div className="text-xs text-muted-foreground">{rule.description}</div>
              </div>
              <span
                className={
                  "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium " +
                  (c?.passed
                    ? "bg-success/15 text-success"
                    : "bg-destructive/15 text-destructive")
                }
                style={{ color: c?.passed ? "var(--color-success)" : "var(--color-destructive)" }}
              >
                {c?.passed ? "✓" : "!"} {c?.detail}
              </span>
            </div>
          );
        })}
      </CardContent>
    </Card>
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
  const candidates = dishesForSlot(slot)
    .filter((d) => d.id !== current.id)
    .filter((d) => Math.abs(d.kcal - current.kcal) <= 150)
    .filter((d) => isSwapAllowed(d, slot, dayIdx, plan, customRules))
    .slice(0, 4);

  if (candidates.length === 0) {
    return <p className="text-sm text-muted-foreground">No swap candidates match your rules right now. Loosen a rule on the Rules page and try again.</p>;
  }

  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {candidates.map((d) => (
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
  );
}

function RecentStrip({
  log,
  start,
  plan,
  todayIdx,
}: {
  log: ReturnType<typeof useMealLog>["log"];
  start: number;
  plan: ReturnType<typeof applyOverrides>;
  todayIdx: number;
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
                  const st = log[logKey(start, d, s)]?.status;
                  return (
                    <div
                      key={s}
                      title={`${DISHES_BY_ID[plan[d][s]]?.name} · ${st ?? "not logged"}`}
                      className={
                        "h-3 rounded-sm " +
                        (st === "eaten" ? "bg-success" : st === "skipped" ? "bg-muted" : "bg-border/60")
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
