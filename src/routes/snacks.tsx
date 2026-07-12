import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CRAVING_META, SNACKS_BY_ID, suggestSnacks, type Craving } from "@/lib/snacks";
import { currentDayIndex, logKey, useCycleStart, useMealLog } from "@/lib/store";
import { toast } from "sonner";
import { DishDetailDialog } from "@/components/dish-detail";
import type { Dish } from "@/lib/dishes";

export const Route = createFileRoute("/snacks")({
  head: () => ({
    meta: [
      { title: "Snacks · Thali" },
      { name: "description", content: "Pick a craving and get quick Indian vegetarian snack suggestions that match how you feel." },
      { property: "og:title", content: "Snacks · Thali" },
      { property: "og:description", content: "Craving-based snack suggestions for your Indian vegetarian meal plan." },
    ],
  }),
  component: SnacksPage,
});

const CRAVINGS = Object.keys(CRAVING_META) as Craving[];

function SnacksPage() {
  const [selected, setSelected] = useState<Craving[]>([]);
  const [detail, setDetail] = useState<Dish | null>(null);
  const { start } = useCycleStart();
  const { log, setEntry } = useMealLog();
  const dayIdx = currentDayIndex(start);

  const suggestions = useMemo(() => suggestSnacks(selected).slice(0, 8), [selected]);

  const toggle = (c: Craving) =>
    setSelected((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  const loggedToday = Object.entries(log).filter(
    ([k, v]) => v.status === "eaten" && k.startsWith(`${start}-d${dayIdx}-snack-`),
  );

  const logSnack = (id: string) => {
    setEntry(logKey(start, dayIdx, "snack", id), "eaten");
    toast.success(`Logged ${SNACKS_BY_ID[id]?.name}`);
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Snack break</p>
        <h1 className="font-display text-4xl font-semibold">What are you craving?</h1>
        <p className="mt-1 text-muted-foreground">Pick one or more. We'll suggest snacks that match.</p>
      </header>

      <div className="flex flex-wrap gap-2">
        {CRAVINGS.map((c) => {
          const on = selected.includes(c);
          return (
            <button
              key={c}
              onClick={() => toggle(c)}
              className={
                "rounded-full border px-4 py-2 text-sm transition " +
                (on
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/70")
              }
            >
              <span className="mr-1">{CRAVING_META[c].emoji}</span> {CRAVING_META[c].label}
            </button>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {suggestions.map((s) => (
          <Card key={s.id}>
            <CardContent className="space-y-3 p-4">
              <button className="flex w-full items-start gap-3 text-left" onClick={() => setDetail(s)}>
                <span className="text-3xl">{s.emoji}</span>
                <div className="flex-1">
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.kcal} kcal · P{s.protein} C{s.carbs} F{s.fat}
                  </div>
                </div>
              </button>
              <div className="flex flex-wrap gap-1">
                {s.cravings.map((c) => (
                  <span key={c} className="rounded-full bg-secondary px-2 py-0.5 text-[10px] uppercase tracking-wide text-secondary-foreground">
                    {CRAVING_META[c].emoji} {c}
                  </span>
                ))}
              </div>
              <Button variant="outline" size="sm" className="w-full" onClick={() => logSnack(s.id)}>
                I ate this
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {loggedToday.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="mb-2 text-sm font-semibold">Logged today</div>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {loggedToday.map(([k]) => {
                const id = k.split("-").pop()!;
                const s = SNACKS_BY_ID[id];
                if (!s) return null;
                return <li key={k}>{s.emoji} {s.name} — {s.kcal} kcal</li>;
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <DishDetailDialog dish={detail} open={detail !== null} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  );
}