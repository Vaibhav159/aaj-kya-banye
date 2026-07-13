import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  DISHES,
  type Dish,
  type Slot,
  type Cuisine,
  type CookingType,
  type Equipment,
} from "@/lib/dishes";
import { useCustomDishes } from "@/lib/store";
import { DishDetailDialog } from "@/components/dish-detail";

export const Route = createFileRoute("/database")({
  head: () => ({
    meta: [
      { title: "Dish Database · Aaj Kya Banaye?" },
      { name: "description", content: "Searchable database of Indian vegetarian dishes with calorie and macro details." },
      { property: "og:title", content: "Dish Database · Aaj Kya Banaye?" },
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

const CUISINES: Cuisine[] = [
  "north-indian",
  "south-indian",
  "gujarati",
  "punjabi",
  "bengali",
  "maharashtrian",
  "indo-chinese",
  "continental",
];

const COOKING_TYPES: CookingType[] = [
  "stovetop",
  "no-cook",
  "steamed",
  "baked",
  "fried",
  "grilled",
  "instant-pot",
];

const EQUIPMENTS: Equipment[] = [
  "stove",
  "oven",
  "airfryer",
  "microwave",
  "blender",
  "pressure-cooker",
  "griddle",
];

function DatabasePage() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | Slot>("all");
  const { dishes: custom, add, update, remove } = useCustomDishes();
  const [detail, setDetail] = useState<Dish | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  // Deduplicate dishes by ID, favoring custom overrides
  const all = useMemo(() => {
    const map = new Map<string, Dish>();
    DISHES.forEach((d) => map.set(d.id, d));
    custom.forEach((d) => map.set(d.id, d));
    return Array.from(map.values());
  }, [custom]);

  const filtered = useMemo(() => {
    return all
      .filter((d) => (filter === "all" ? true : d.slots.includes(filter)))
      .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  }, [q, filter, all]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Dish Database</p>
          <h1 className="font-display text-4xl font-semibold">{all.length} Indian vegetarian dishes</h1>
          {custom.length > 0 && <p className="text-sm text-muted-foreground">{custom.length} custom / overrides</p>}
        </div>
        <Button
          onClick={() => {
            setShowAdd((s) => !s);
            setEditingDish(null);
          }}
        >
          {showAdd ? "Close" : "+ Add dish"}
        </Button>
      </header>

      {showAdd && (
        <DishForm
          onSubmit={(d) => {
            add(d);
            toast.success(`Added ${d.name}`);
            setShowAdd(false);
          }}
          onCancel={() => setShowAdd(false)}
          submitLabel="Add to my dishes"
        />
      )}

      {editingDish && (
        <DishForm
          initialDish={editingDish}
          onSubmit={(d) => {
            const isCustom = custom.some((x) => x.id === editingDish.id);
            if (isCustom) {
              update(editingDish.id, d);
            } else {
              add({ ...d, id: editingDish.id });
            }
            toast.success(`Updated ${d.name}`);
            setEditingDish(null);
          }}
          onCancel={() => setEditingDish(null)}
          submitLabel="Save changes"
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
          const isBuiltIn = DISHES.some((x) => x.id === d.id);

          return (
            <Card key={d.id}>
              <CardContent className="space-y-3 p-4 flex flex-col justify-between h-full">
                <div className="space-y-3">
                  <button onClick={() => setDetail(d)} className="flex w-full items-start gap-3 text-left">
                    <span className="text-3xl">{d.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium flex items-center gap-2 truncate">
                        <span className="truncate">{d.name}</span>
                        {isCustom && (
                          <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">
                            {isBuiltIn ? "edited" : "yours"}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
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
                </div>

                <div className="flex gap-2 pt-2 border-t mt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      setEditingDish(d);
                      setShowAdd(false);
                    }}
                  >
                    Edit
                  </Button>
                  {isCustom && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10"
                      onClick={() => {
                        remove(d.id);
                        toast.success(isBuiltIn ? `Reset ${d.name} to default` : `Removed ${d.name}`);
                      }}
                    >
                      {isBuiltIn ? "Reset" : "Remove"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <DishDetailDialog dish={detail} open={detail !== null} onOpenChange={(o) => !o && setDetail(null)} />
    </div>
  );
}

function DishForm({
  initialDish,
  onSubmit,
  onCancel,
  submitLabel = "Save dish",
}: {
  initialDish?: Dish;
  onSubmit: (d: Omit<Dish, "id"> & { id?: string }) => void;
  onCancel?: () => void;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialDish?.name ?? "");
  const [emoji, setEmoji] = useState(initialDish?.emoji ?? "🍽️");
  const [kcal, setKcal] = useState(initialDish?.kcal ?? 400);
  const [protein, setProtein] = useState(initialDish?.protein ?? 15);
  const [carbs, setCarbs] = useState(initialDish?.carbs ?? 50);
  const [fat, setFat] = useState(initialDish?.fat ?? 15);
  const [slots, setSlots] = useState<Slot[]>(initialDish?.slots ?? ["lunch"]);
  const [recipeUrl, setRecipeUrl] = useState(initialDish?.recipeUrl ?? "");

  // Advanced metadata fields
  const [cuisine, setCuisine] = useState<Cuisine | "">(initialDish?.cuisine ?? "");
  const [cookingType, setCookingType] = useState<CookingType | "">(initialDish?.cookingType ?? "");
  const [equipment, setEquipment] = useState<Equipment[]>(initialDish?.equipment ?? []);
  const [prepMinutes, setPrepMinutes] = useState<number>(initialDish?.prepMinutes ?? 25);
  const [spiceLevel, setSpiceLevel] = useState<0 | 1 | 2 | 3>(initialDish?.spiceLevel ?? 1);

  const toggleSlot = (s: Slot) =>
    setSlots((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

  const toggleEquipment = (eq: Equipment) =>
    setEquipment((prev) => (prev.includes(eq) ? prev.filter((x) => x !== eq) : [...prev, eq]));

  const submit = () => {
    if (!name.trim()) return;
    onSubmit({
      name: name.trim(),
      emoji,
      kcal,
      protein,
      carbs,
      fat,
      slots,
      tags: initialDish?.tags ?? [],
      ingredients: initialDish?.ingredients ?? [],
      recipeUrl: recipeUrl.trim() || undefined,
      cuisine: cuisine || undefined,
      cookingType: cookingType || undefined,
      equipment: equipment.length > 0 ? equipment : undefined,
      prepMinutes: prepMinutes || undefined,
      spiceLevel: spiceLevel,
    });
  };

  return (
    <Card className="border-2 border-primary/20">
      <CardContent className="space-y-4 p-5">
        <div className="flex items-center justify-between border-b pb-2">
          <h3 className="font-semibold text-lg">{initialDish ? "Edit Dish" : "Add New Dish"}</h3>
          {onCancel && (
            <Button variant="ghost" size="sm" type="button" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        {/* Row 1: Name and Emoji */}
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

        {/* Row 2: Macros */}
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

        {/* Row 3: Slots */}
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Meal Slots</Label>
          <div className="flex flex-wrap gap-2">
            {(["breakfast", "lunch", "dinner"] as Slot[]).map((s) => (
              <button
                type="button"
                key={s}
                onClick={() => toggleSlot(s)}
                className={
                  "rounded-full border px-3 py-1 text-xs capitalize transition " +
                  (slots.includes(s)
                    ? "border-primary bg-primary text-primary-foreground font-medium"
                    : "border-border bg-secondary text-secondary-foreground hover:bg-secondary/70")
                }
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Row 4: Cuisine & Cooking Type */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cuisine</Label>
            <select
              value={cuisine}
              onChange={(e) => setCuisine(e.target.value as Cuisine)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
            >
              <option value="">Default / Unspecified</option>
              {CUISINES.map((c) => (
                <option key={c} value={c}>
                  {c.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cooking Style</Label>
            <select
              value={cookingType}
              onChange={(e) => setCookingType(e.target.value as CookingType)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
            >
              <option value="">Default / Unspecified</option>
              {COOKING_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t.replace(/-/g, " ")}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Row 5: Equipment Multi-select */}
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Equipment Required</Label>
          <div className="flex flex-wrap gap-2">
            {EQUIPMENTS.map((eq) => {
              const active = equipment.includes(eq);
              return (
                <button
                  type="button"
                  key={eq}
                  onClick={() => toggleEquipment(eq)}
                  className={
                    "rounded-md border px-2.5 py-1 text-xs capitalize transition " +
                    (active
                      ? "border-accent bg-accent text-accent-foreground font-medium"
                      : "border-border bg-secondary/50 text-muted-foreground hover:bg-secondary")
                  }
                >
                  {eq.replace(/-/g, " ")}
                </button>
              );
            })}
          </div>
        </div>

        {/* Row 6: Prep Time & Spice Level */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Prep Time (minutes)</Label>
            <Input
              type="number"
              value={prepMinutes}
              onChange={(e) => setPrepMinutes(Number(e.target.value))}
              placeholder="25"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Spice Level</Label>
            <select
              value={spiceLevel}
              onChange={(e) => setSpiceLevel(Number(e.target.value) as 0 | 1 | 2 | 3)}
              className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="0">0 - None</option>
              <option value="1">1 - Mild</option>
              <option value="2">2 - Medium</option>
              <option value="3">3 - Hot 🌶️</option>
            </select>
          </div>
        </div>

        {/* Row 7: Recipe URL */}
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Recipe URL (optional)</Label>
          <Input
            value={recipeUrl}
            onChange={(e) => setRecipeUrl(e.target.value)}
            placeholder="https://youtube.com/…"
          />
        </div>

        <div className="flex gap-2 pt-2">
          <Button onClick={submit} className="flex-1" type="button" disabled={!name.trim() || slots.length === 0}>
            {submitLabel}
          </Button>
          {onCancel && (
            <Button variant="outline" type="button" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}