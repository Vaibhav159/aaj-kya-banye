import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DISHES, type Dish, type Slot } from "@/lib/dishes";
import { useCustomDishes } from "@/lib/store";
import { DishDetailDialog } from "@/components/dish-detail";

export const Route = createFileRoute("/database")({
  head: () => ({
    meta: [
      { title: "Dish Database · Thali" },
      { name: "description", content: "Searchable database of Indian vegetarian dishes with calorie and macro details." },
      { property: "og:title", content: "Dish Database · Thali" },
      { property: "og:description", content: "Browse Indian vegetarian dishes with kcal, protein, carbs and fat." },
    ],
  }),
  component: DatabasePage,
});

const FILTERS: { id: "all" | Slot; label: string }[] = [
  { id: "all", label: "All" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
];

function DatabasePage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Slot>("all");
  const { dishes: custom, add, remove } = useCustomDishes();
  const [detail, setDetail] = useState<Dish | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const all = useMemo(() => [...DISHES, ...custom], [custom]);

  const filtered = useMemo(() => {
    return all.filter((d) => (filter === "all" ? true : d.slots.includes(filter))).filter((d) =>
      d.name.toLowerCase().includes(q.toLowerCase()),
    );
  }, [q, filter, all]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Dish Database</p>
          <h1 className="font-display text-4xl font-semibold">{all.length} Indian vegetarian dishes</h1>
          {custom.length > 0 && <p className="text-sm text-muted-foreground">{custom.length} custom</p>}
        </div>
        <Button onClick={() => setShowAdd((s) => !s)}>{showAdd ? "Close" : "+ Add dish"}</Button>
      </header>

      {showAdd && (
        <AddDishForm
          onAdd={(d) => {
            add(d);
            toast.success(`Added ${d.name}`);
            setShowAdd(false);
          }}
        />
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search dishes…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={
                "rounded-full px-3 py-1 text-sm transition " +
                (filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70")
              }
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="ml-auto text-sm text-muted-foreground">{filtered.length} results</div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((d) => {
          const total = d.protein * 4 + d.carbs * 4 + d.fat * 9 || 1;
          const p = (d.protein * 4 / total) * 100;
          const c = (d.carbs * 4 / total) * 100;
          const isCustom = "custom" in d && Boolean((d as { custom?: boolean }).custom);
          return (
            <Card key={d.id}>
              <CardContent className="space-y-3 p-4">
                <button onClick={() => setDetail(d)} className="flex w-full items-start gap-3 text-left">
                  <span className="text-3xl">{d.emoji}</span>
                  <div className="flex-1">
                    <div className="font-medium">
                      {d.name}
                      {isCustom && <span className="ml-2 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">yours</span>}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {d.slots.join(" · ")} · {d.kcal} kcal
                    </div>
                  </div>
                </button>
                <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                  <div style={{ width: `${p}%`, background: "var(--color-primary)" }} />
                  <div style={{ width: `${c}%`, background: "var(--color-accent)" }} />
                  <div style={{ flex: 1, background: "var(--color-success)" }} />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>P {d.protein}g</span>
                  <span>C {d.carbs}g</span>
                  <span>F {d.fat}g</span>
                </div>
                {isCustom && (
                  <Button variant="ghost" size="sm" className="w-full text-destructive" onClick={() => remove(d.id)}>
                    Remove
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DishDetailDialog dish={detail} open={detail !== null} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  );
}

function AddDishForm({ onAdd }: { onAdd: (d: Omit<Dish, "id">) => void }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🍽️");
  const [kcal, setKcal] = useState(400);
  const [protein, setProtein] = useState(15);
  const [carbs, setCarbs] = useState(50);
  const [fat, setFat] = useState(15);
  const [slots, setSlots] = useState<Slot[]>(["lunch"]);
  const [recipeUrl, setRecipeUrl] = useState("");

  const toggle = (s: Slot) =>
    setSlots((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const submit = () => {
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      emoji,
      kcal,
      protein,
      carbs,
      fat,
      slots,
      tags: [],
      ingredients: [],
      recipeUrl: recipeUrl.trim() || undefined,
    });
    setName("");
    setRecipeUrl("");
  };

  return (
    <Card>
      <CardContent className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Dish name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Sprouts Bhel" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Emoji</Label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} className="w-20 text-center" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {(["kcal", "protein", "carbs", "fat"] as const).map((k) => (
            <div key={k} className="space-y-1">
              <Label className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</Label>
              <Input
                type="number"
                value={{ kcal, protein, carbs, fat }[k]}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (k === "kcal") setKcal(v);
                  if (k === "protein") setProtein(v);
                  if (k === "carbs") setCarbs(v);
                  if (k === "fat") setFat(v);
                }}
              />
            </div>
          ))}
        </div>
        <div className="flex flex-wrap gap-2">
          {(["breakfast", "lunch", "dinner"] as Slot[]).map((s) => (
            <button
              key={s}
              onClick={() => toggle(s)}
              className={
                "rounded-full border px-3 py-1 text-xs capitalize transition " +
                (slots.includes(s)
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary text-secondary-foreground")
              }
            >
              {s}
            </button>
          ))}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Recipe URL (optional)</Label>
          <Input value={recipeUrl} onChange={(e) => setRecipeUrl(e.target.value)} placeholder="https://youtube.com/…" />
        </div>
        <Button onClick={submit} disabled={!name.trim() || slots.length === 0}>Add to my dishes</Button>
      </CardContent>
    </Card>
  );
}