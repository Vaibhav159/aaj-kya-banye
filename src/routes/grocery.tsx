import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CATEGORY_EMOJI, type IngredientCategory } from "@/lib/dishes";
import { aggregateGrocery, toCopyText } from "@/lib/grocery";
import { applyOverrides, currentDayIndex, useCycleStart, useOverrides } from "@/lib/store";

export const Route = createFileRoute("/grocery")({
  head: () => ({
    meta: [
      { title: "Grocery · Thali" },
      { name: "description", content: "Smart grocery list aggregated from your meal plan, grouped by category with copy-to-clipboard." },
      { property: "og:title", content: "Grocery · Thali" },
      { property: "og:description", content: "Aggregated grocery list from your Indian vegetarian meal plan." },
    ],
  }),
  component: GroceryPage,
});

const RANGES: { id: string; label: string; days: number; offset: number }[] = [
  { id: "today", label: "Today", days: 1, offset: 0 },
  { id: "2d", label: "2 Days", days: 2, offset: 0 },
  { id: "3d", label: "3 Days", days: 3, offset: 0 },
  { id: "week", label: "This Week", days: 7, offset: 0 },
  { id: "next", label: "Next Week", days: 7, offset: 7 },
];

const CATS: IngredientCategory[] = ["veg", "grain", "dairy", "legume", "fruit", "nut", "oil", "spice", "other"];

function GroceryPage() {
  const { start } = useCycleStart();
  const { overrides } = useOverrides();
  const dayIdx = currentDayIndex(start);
  const plan = useMemo(() => applyOverrides(overrides), [overrides]);
  const [range, setRange] = useState(RANGES[3]);

  const slice = useMemo(() => {
    return Array.from({ length: range.days }, (_, i) => plan[(dayIdx + range.offset + i) % 42]);
  }, [plan, dayIdx, range]);

  const grouped = useMemo(() => aggregateGrocery(slice), [slice]);

  const copyList = async () => {
    const text = toCopyText(grouped);
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Grocery list copied");
    } catch {
      toast.error("Could not copy — long-press to select instead");
    }
  };

  const totalItems = CATS.reduce((n, c) => n + grouped[c].length, 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Smart list</p>
          <h1 className="font-display text-4xl font-semibold">Grocery</h1>
          <p className="mt-1 text-muted-foreground">{totalItems} items across {range.days} day{range.days > 1 ? "s" : ""}</p>
        </div>
        <Button onClick={copyList}>Copy list</Button>
      </header>

      <div className="flex flex-wrap gap-2">
        {RANGES.map((r) => (
          <button
            key={r.id}
            onClick={() => setRange(r)}
            className={
              "rounded-full px-4 py-1.5 text-sm transition " +
              (r.id === range.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/70")
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {CATS.filter((c) => grouped[c].length > 0).map((cat) => (
          <Card key={cat}>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <span className="text-2xl">{CATEGORY_EMOJI[cat]}</span>
                <span className="capitalize">{cat}</span>
                <span className="ml-auto text-xs text-muted-foreground">{grouped[cat].length}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm">
                {grouped[cat].map((it) => (
                  <li key={it.name + it.unit} className="flex justify-between border-b border-dashed border-border/60 py-1">
                    <span>{it.name}</span>
                    <span className="tabular-nums text-muted-foreground">{it.qty}{it.unit}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}