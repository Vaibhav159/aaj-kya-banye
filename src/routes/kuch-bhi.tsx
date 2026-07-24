import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

// --- Question system ---

type QId = "cuisine-south" | "fried" | "light" | "spicy" | "paneer" | "rice" | "sweet" | "cuisine-chinese" | "prep-time";

interface BaseQuestion {
  id: QId;
  text: string;
}
interface BinaryQuestion extends BaseQuestion {
  type: "binary";
  filter: (d: Dish) => boolean;
}
interface MultiQuestion extends BaseQuestion {
  type: "multi";
  options: { label: string; filter: (d: Dish) => boolean }[];
}
type Question = BinaryQuestion | MultiQuestion;

const QUESTIONS: Question[] = [
  { id: "cuisine-south", type: "binary", text: "South Indian vibes?", filter: (d) => d.cuisine === "south-indian" },
  { id: "fried", type: "binary", text: "Craving fried / crispy food?", filter: (d) => d.cookingType === "fried" || d.tags.includes("fried-breakfast") },
  { id: "light", type: "binary", text: "Something light & easy?", filter: (d) => d.tags.includes("light") || d.kcal <= 480 },
  { id: "spicy", type: "binary", text: "Feeling spicy? 🌶️", filter: (d) => (d.spiceLevel ?? 1) >= 2 },
  { id: "paneer", type: "binary", text: "Paneer on the plate? 🧀", filter: (d) => d.tags.includes("paneer") || /paneer/i.test(d.name) },
  { id: "rice", type: "binary", text: "Rice-based meal? 🍚", filter: (d) => d.tags.includes("rice") || /rice|biryani|pulao|khichdi/i.test(d.name) },
  { id: "sweet", type: "binary", text: "Want a hint of sweetness?", filter: (d) => d.tags.includes("sweet") },
  { id: "cuisine-chinese", type: "binary", text: "Indo-Chinese instead?", filter: (d) => d.cuisine === "indo-chinese" },
  {
    id: "prep-time", type: "multi", text: "How much cooking?",
    options: [
      { label: "< 15 min", filter: (d) => (d.prepMinutes ?? 30) <= 15 },
      { label: "< 30 min", filter: (d) => (d.prepMinutes ?? 30) <= 30 },
      { label: "Any", filter: () => true },
    ],
  },
];

// ponytail: answer is stored as boolean for binary, or option index for multi
type Answer = boolean | number;

function slotFromClock(): Slot {
  if (typeof window === "undefined") return "dinner";
  const h = new Date().getHours();
  if (h < 11) return "breakfast";
  if (h < 16) return "lunch";
  return "dinner";
}

// --- Animated counter ---

function AnimatedCounter({ value, className }: { value: number; className?: string }) {
  const [displayed, setDisplayed] = useState(value);
  const prevRef = useRef(value);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    prevRef.current = value;
    if (from === to) return;

    const duration = 400;
    const start = performance.now();
    let raf: number;

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayed(Math.round(from + (to - from) * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);

  return <span className={className}>{displayed}</span>;
}

// --- Filter trail pill ---

function TrailPill({ label, value, onRemove }: { label: string; value: string; onRemove: () => void }) {
  return (
    <button
      onClick={onRemove}
      className="group inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary transition-all hover:bg-destructive/10 hover:text-destructive"
    >
      <span>{label}:</span>
      <span className="font-semibold">{value}</span>
      <span className="opacity-0 group-hover:opacity-100 transition-opacity">✕</span>
    </button>
  );
}

// --- Main ---

function DecidePage() {
  const { rules } = useCustomRules();
  const { start, length } = useCycleStart();
  const { overrides, setOne } = useOverrides();
  const dayIdx = currentDayIndex(start, Date.now(), length);
  const [slot, setSlot] = useState<Slot>(slotFromClock());
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [asked, setAsked] = useState<QId[]>([]);
  const [revealed, setRevealed] = useState(false);
  // ponytail: track history of candidate counts for the funnel trail
  const [countHistory, setCountHistory] = useState<number[]>([]);

  const initialPool = useMemo(
    () => dishesForSlot(slot).filter((d) => passesRules(d, slot, rules)),
    [slot, rules],
  );

  const pool = useMemo(() => {
    return initialPool.filter((d) => {
      for (const q of QUESTIONS) {
        const a = answers[q.id];
        if (a === undefined || a === null) continue;
        if (q.type === "binary") {
          const matches = q.filter(d);
          if (a && !matches) return false;
          if (!a && matches) return false;
        } else {
          // multi: a is the option index
          const opt = q.options[a as number];
          if (opt && !opt.filter(d)) return false;
        }
      }
      return true;
    });
  }, [initialPool, answers]);

  // Auto-reveal when no more questions can narrow the pool
  const noMoreQuestions = useMemo(() => {
    if (pool.length <= 3) return true;
    const remaining = QUESTIONS.filter((q) => !asked.includes(q.id));
    for (const q of remaining) {
      if (q.type === "multi") return false; // multi always useful
      const yes = pool.filter(q.filter).length;
      if (yes > 0 && yes < pool.length) return false;
    }
    return true;
  }, [pool, asked]);

  useEffect(() => {
    if ((pool.length <= 3 || noMoreQuestions) && asked.length > 0 && !revealed) {
      const timer = setTimeout(() => setRevealed(true), 600);
      return () => clearTimeout(timer);
    }
  }, [pool.length, asked.length, revealed, noMoreQuestions]);

  const nextQuestion: Question | null = useMemo(() => {
    if (pool.length <= 3 || asked.length >= 6) return null;
    const candidates = QUESTIONS.filter((q) => !asked.includes(q.id));
    let best: Question | null = null;
    let bestScore = Infinity;
    for (const q of candidates) {
      if (q.type === "multi") {
        // ponytail: multi questions always have some split value, just give them a reasonable score
        const score = 5;
        if (score < bestScore) { bestScore = score; best = q; }
        continue;
      }
      const yes = pool.filter(q.filter).length;
      const no = pool.length - yes;
      if (yes === 0 || no === 0) continue;
      const score = Math.abs(yes - no);
      if (score < bestScore) { bestScore = score; best = q; }
    }
    return best;
  }, [pool, asked]);

  const answerBinary = useCallback((v: boolean) => {
    if (!nextQuestion) return;
    setAnswers((p) => ({ ...p, [nextQuestion.id]: v }));
    setAsked((a) => [...a, nextQuestion.id]);
    setCountHistory((h) => [...h, pool.length]);
  }, [nextQuestion, pool.length]);

  const answerMulti = useCallback((optionIndex: number) => {
    if (!nextQuestion) return;
    setAnswers((p) => ({ ...p, [nextQuestion.id]: optionIndex }));
    setAsked((a) => [...a, nextQuestion.id]);
    setCountHistory((h) => [...h, pool.length]);
  }, [nextQuestion, pool.length]);

  const removeAnswer = useCallback((qId: QId) => {
    setAnswers((p) => {
      const next = { ...p };
      delete next[qId];
      return next;
    });
    setAsked((a) => {
      const idx = a.indexOf(qId);
      if (idx === -1) return a;
      // Remove this and all subsequent answers (they depend on this filter state)
      const removed = a.slice(idx);
      // Also clean answers for removed questions
      setAnswers((prev) => {
        const cleaned = { ...prev };
        for (const r of removed) delete cleaned[r];
        return cleaned;
      });
      return a.slice(0, idx);
    });
    setCountHistory((h) => h.slice(0, asked.indexOf(qId)));
    setRevealed(false);
  }, [asked]);

  const reset = useCallback(() => {
    setAnswers({});
    setAsked([]);
    setRevealed(false);
    setCountHistory([]);
  }, []);

  const cook = useCallback((d: Dish) => {
    setOne(dayIdx, slot, d.id);
    toast.success(`Set ${d.name} as today's ${slot}`);
  }, [dayIdx, slot, setOne]);

  const plan = applyOverrides(overrides);
  const currentDishName = DISHES.find((x) => x.id === plan[dayIdx][slot])?.name;

  // Build trail labels
  const trailItems = asked.map((qId) => {
    const q = QUESTIONS.find((x) => x.id === qId)!;
    const a = answers[qId];
    let valueLabel: string;
    if (q.type === "multi") {
      valueLabel = q.options[a as number]?.label ?? "?";
    } else {
      valueLabel = a ? "Yes" : "No";
    }
    return { qId, label: q.text.replace(/[?🌶️🧀🍚]/g, "").trim(), value: valueLabel };
  });

  const isFinished = !nextQuestion || pool.length <= 3 || noMoreQuestions;
  const showResults = isFinished && revealed;

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-6">
      <header>
        <p className="text-sm uppercase tracking-wide text-muted-foreground">Kuch Bhi</p>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold">IDK what to eat 🎲</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer a few questions — watch the options narrow down.
          {currentDishName && <> Currently planned: <span className="font-medium">{currentDishName}</span>.</>}
        </p>
      </header>

      {/* Slot picker */}
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
      </div>

      {/* === THE FUNNEL === */}

      {/* Candidate counter — the hero number */}
      <div className="text-center py-4">
        <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">
          {showResults ? "We found" : "Candidates"}
        </div>
        <AnimatedCounter
          value={pool.length}
          className="font-display text-6xl sm:text-7xl font-bold tabular-nums bg-gradient-to-br from-primary to-primary/60 bg-clip-text text-transparent"
        />
        <div className="text-sm text-muted-foreground mt-1">
          {showResults ? (pool.length === 1 ? "dish" : "dishes") : (pool.length === 1 ? "dish left" : "dishes left")}
        </div>
      </div>

      {/* Filter trail — breadcrumbs of past answers */}
      {trailItems.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center">
          {trailItems.map((item, i) => (
            <div key={item.qId} className="flex items-center gap-1">
              {i > 0 && <span className="text-muted-foreground/40 text-xs">→</span>}
              <TrailPill
                label={item.label}
                value={item.value}
                onRemove={() => removeAnswer(item.qId as QId)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Count history funnel visualization */}
      {countHistory.length > 0 && !showResults && (
        <div className="flex items-center justify-center gap-1 text-sm">
          {countHistory.map((c, i) => (
            <span key={i} className="flex items-center gap-1">
              <span className="text-muted-foreground/60 font-medium tabular-nums">{c}</span>
              <span className="text-muted-foreground/30">→</span>
            </span>
          ))}
          <span className="font-bold text-primary tabular-nums">{pool.length}</span>
        </div>
      )}

      {/* Active question */}
      {!isFinished && nextQuestion && (
        <Card className="border-2 border-primary/40 overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300">
          <CardContent className="space-y-5 p-6 sm:p-8 text-center">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              Question {asked.length + 1}
            </p>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold">{nextQuestion.text}</h2>
            {nextQuestion.type === "binary" ? (
              <div className="grid grid-cols-2 gap-3">
                <Button size="lg" variant="outline" className="h-14 text-lg" onClick={() => answerBinary(false)}>
                  Nah
                </Button>
                <Button size="lg" className="h-14 text-lg" onClick={() => answerBinary(true)}>
                  Yes!
                </Button>
              </div>
            ) : (
              <div className="grid gap-2">
                {nextQuestion.options.map((opt, i) => (
                  <Button
                    key={i}
                    size="lg"
                    variant={i === nextQuestion.options.length - 1 ? "outline" : "default"}
                    className="h-12 text-base"
                    onClick={() => answerMulti(i)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            )}
            {asked.length > 0 && (
              <Button variant="ghost" size="sm" onClick={reset} className="text-muted-foreground">
                Start over
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Waiting for reveal (pool ≤ 3 but not yet revealed) */}
      {isFinished && !showResults && (
        <div className="text-center py-8 animate-in fade-in duration-300">
          <div className="inline-flex items-center gap-2 text-primary">
            <span className="animate-pulse text-2xl">✨</span>
            <span className="font-display text-lg font-medium">Finding your perfect meal…</span>
            <span className="animate-pulse text-2xl">✨</span>
          </div>
        </div>
      )}

      {/* Results reveal */}
      {showResults && (
        <div className="space-y-3 animate-in fade-in slide-in-from-bottom-6 duration-500">
          <h2 className="font-display text-xl font-semibold text-center">
            {pool.length === 0 ? "No matches — try loosening a filter" : "Here's what to make 🎉"}
          </h2>
          {pool.slice(0, 3).map((d, i) => (
            <Card
              key={d.id}
              className="animate-in fade-in slide-in-from-bottom-4 duration-300"
              style={{ animationDelay: `${i * 120}ms`, animationFillMode: "backwards" }}
            >
              <CardContent className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 p-4">
                <span className="text-3xl">{d.emoji}</span>
                <div className="min-w-0">
                  <div className="truncate font-medium">{d.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.kcal} kcal · {d.protein}g protein · {d.prepMinutes ?? "?"} min
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