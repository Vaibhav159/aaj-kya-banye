import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DISHES, dishesForSlot, type Dish, type Slot } from "@/lib/dishes";
import { passesRules, useCustomRules } from "@/lib/custom-rules";
import { applyOverrides, currentDayIndex, useCycleStart, useOverrides } from "@/lib/store";

export const Route = createFileRoute("/kuch-bhi")({
  head: () => ({
    meta: [
      { title: "Kuch Bhi - Instant Meal Decision Helper · Aaj Kya Banaye?" },
      { name: "description", content: "Can't decide what to cook? Answer quick questions about craving, prep time, and spice level to get instant Indian vegetarian meal recommendations." },
      { property: "og:title", content: "Kuch Bhi - Instant Indian Meal Finder · Aaj Kya Banaye?" },
      { property: "og:description", content: "Interactive meal decision helper for Indian vegetarian cooking." },
    ],
  }),
  component: DecidePage,
});

type QId = "quick" | "spicy" | "fried" | "sweet" | "light" | "cuisine-south" | "cuisine-chinese" | "paneer" | "rice";
interface Question {
  id: QId;
  text: string;
  filter: (d: Dish) => boolean;
}

const QUESTIONS: Question[] = [
  { id: "quick", text: "In the mood for something quick (≤ 25 min prep)?", filter: (d) => (d.prepMinutes ?? 30) <= 25 },
  { id: "light", text: "Something light and easy on the stomach?", filter: (d) => d.tags.includes("light") || d.kcal <= 480 },
  { id: "spicy", text: "Feeling spicy?", filter: (d) => (d.spiceLevel ?? 1) >= 2 },
  { id: "fried", text: "Craving fried / crispy food?", filter: (d) => d.cookingType === "fried" || d.tags.includes("fried-breakfast") },
  { id: "sweet", text: "Want a hint of sweetness?", filter: (d) => d.tags.includes("sweet") },
  { id: "cuisine-south", text: "South Indian vibes?", filter: (d) => d.cuisine === "south-indian" },
  { id: "cuisine-chinese", text: "Indo-Chinese instead?", filter: (d) => d.cuisine === "indo-chinese" },
  { id: "paneer", text: "Paneer on the plate?", filter: (d) => /paneer/i.test(d.name) },
  { id: "rice", text: "Rice-based meal?", filter: (d) => /rice|biryani|pulao|khichdi|dosa/i.test(d.name) },
];

function slotFromClock(): Slot {
  if (typeof window === "undefined") return "dinner";
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  return "dinner";
}

function DecidePage() {
  const { rules } = useCustomRules();
  const { start } = useCycleStart();
  const { overrides, setOne } = useOverrides();
  const dayIdx = currentDayIndex(start);
  const [slot, setSlot] = useState<Slot>(slotFromClock());
  const [answers, setAnswers] = useState<Record<string, boolean | null>>({});
  const [asked, setAsked] = useState<QId[]>([]);

  const initialPool = useMemo(
    () => dishesForSlot(slot).filter((d) => passesRules(d, slot, rules)),
    [slot, rules],
  );

  const pool = useMemo(() => {
    return initialPool.filter((d) => {
      for (const q of QUESTIONS) {
        const a = answers[q.id];
        if (a === undefined || a === null) continue;
        const matches = q.filter(d);
        if (a && !matches) return false;
        if (!a && matches) return false;
      }
      return true;
    });
  }, [initialPool, answers]);

  const nextQuestion: Question | null = useMemo(() => {
    if (pool.length <= 3 || asked.length >= 6) return null;
    // Pick unasked question that splits pool most evenly.
    const candidates = QUESTIONS.filter((q) => !asked.includes(q.id));
    let best: Question | null = null;
    let bestScore = Infinity;
    for (const q of candidates) {
      const yes = pool.filter(q.filter).length;
      const no = pool.length - yes;
      if (yes === 0 || no === 0) continue;
      const score = Math.abs(yes - no);
      if (score < bestScore) { bestScore = score; best = q; }
    }
    return best;
  }, [pool, asked]);

  const answer = (v: boolean) => {
    if (!nextQuestion) return;
    setAnswers((p) => ({ ...p, [nextQuestion.id]: v }));
    setAsked((a) => [...a, nextQuestion.id]);
  };

  const reset = () => { setAnswers({}); setAsked([]); };

  const cook = (d: Dish) => {
    setOne(dayIdx, slot, d.id);
    toast.success(`Set ${d.name} as today's ${slot}`);
  };

  const plan = applyOverrides(overrides);
  const currentDishName = DISHES.find((x) => x.id === plan[dayIdx][slot])?.name;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Kuch Bhi</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">IDK what to eat 🎲</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer a few yes/no questions and we'll narrow it to 3. Currently planning: <span className="font-medium">{currentDishName}</span>.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs uppercase text-muted-foreground">Meal:</span>
        {(["breakfast", "lunch", "dinner"] as Slot[]).map((s) => (
          <button
            key={s}
            onClick={() => { setSlot(s); reset(); }}
            className={
              "rounded-full px-3 py-1 text-sm capitalize transition " +
              (slot === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground")
            }
          >
            {s}
          </button>
        ))}
        <span className="ml-auto text-xs text-muted-foreground">{pool.length} candidates</span>
      </div>

      {nextQuestion ? (
        <Card className="border-2 border-primary/40">
          <CardContent className="space-y-6 p-8 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">Question {asked.length + 1} of ≤ 6</p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold">{nextQuestion.text}</h2>
            <div className="grid grid-cols-2 gap-3">
              <Button size="lg" variant="outline" className="h-16 text-lg" onClick={() => answer(false)}>👎 No</Button>
              <Button size="lg" className="h-16 text-lg" onClick={() => answer(true)}>👍 Yes</Button>
            </div>
            {asked.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset}>Start over</Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          <h2 className="font-display text-xl font-semibold">
            {pool.length === 0 ? "No matches — loosen a rule?" : `Top ${Math.min(3, pool.length)} for you`}
          </h2>
          {pool.slice(0, 3).map((d) => (
            <Card key={d.id}>
              <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                <span className="text-3xl">{d.emoji}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.kcal} kcal · {d.cuisine} · {d.prepMinutes} min
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {d.recipeUrl && (
                    <a href={d.recipeUrl} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">▶</Button>
                    </a>
                  )}
                  <Button size="sm" onClick={() => cook(d)}>Pick</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={reset} className="w-full">Start over</Button>
        </div>
      )}
    </div>
  );
}