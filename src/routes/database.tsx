import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, SlidersHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DISHES,
  CUISINE_LABELS,
  getDishBase,
  type Dish,
  type Slot,
  type Cuisine,
  type CookingType,
  type Equipment,
} from "@/lib/dishes";
import { useCustomDishes, useFavorites } from "@/lib/store";
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

const SLOT_FILTERS: { id: "all" | Slot; label: string }[] = [
  { id: "all", label: "All Slots" },
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
];

const BASE_OPTIONS = [
  "all",
  "Roti",
  "Rice",
  "Paratha",
  "Dosa/Idli",
  "Dal & Curry",
  "Puri",
  "Poha/Upma",
  "Paneer",
  "Light Meal",
];

const CUISINE_OPTIONS: { id: "all" | Cuisine; label: string }[] = [
  { id: "all", label: "All Cuisines" },
  ...Object.entries(CUISINE_LABELS).map(([k, v]) => ({ id: k as Cuisine, label: v })),
];

function DatabasePage() {
  const [q, setQ] = useState("");
  const [slotFilter, setSlotFilter] = useState<"all" | Slot>("all");
  const [cuisineFilter, setCuisineFilter] = useState<string>("all");
  const [baseFilter, setBaseFilter] = useState<string>("all");
  const [favOnly, setFavOnly] = useState(false);

  const { dishes: custom, add, update, remove } = useCustomDishes();
  const { isFavorite, toggleFavorite } = useFavorites();
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
      .filter((d) => (slotFilter === "all" ? true : d.slots.includes(slotFilter)))
      .filter((d) => (cuisineFilter === "all" ? true : d.cuisine === cuisineFilter))
      .filter((d) => (baseFilter === "all" ? true : getDishBase(d) === baseFilter))
      .filter((d) => (favOnly ? isFavorite(d.id) : true))
      .filter((d) => d.name.toLowerCase().includes(q.toLowerCase()));
  }, [q, slotFilter, cuisineFilter, baseFilter, favOnly, all, isFavorite]);

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

      {/* Filter Toolbar */}
      <div className="space-y-3 rounded-xl border bg-card p-4 shadow-xs">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            placeholder="Search dishes…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="max-w-xs"
          />

          <Button
            variant={favOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setFavOnly((f) => !f)}
            className="gap-1.5"
          >
            <Heart className={`h-4 w-4 ${favOnly ? "fill-current" : ""}`} />
            Favorites Only
          </Button>

          <div className="ml-auto text-sm text-muted-foreground">{filtered.length} dishes match</div>
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-2 border-t text-sm">
          <span className="text-xs font-medium uppercase text-muted-foreground mr-1">Slot:</span>
          {SLOT_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setSlotFilter(f.id)}
              className={
                "rounded-full px-3 py-1 text-xs font-medium transition " +
                (slotFilter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-secondary-foreground hover:bg-secondary/70")
              }
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-medium uppercase text-muted-foreground mr-1">Base:</span>
          {BASE_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => setBaseFilter(b)}
              className={
                "rounded-full px-2.5 py-0.5 text-xs transition " +
                (baseFilter === b
                  ? "bg-primary/90 text-primary-foreground font-medium"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted")
              }
            >
              {b === "all" ? "All Bases" : b}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-xs font-medium uppercase text-muted-foreground mr-1">Cuisine:</span>
          {CUISINE_OPTIONS.map((c) => (
            <button
              key={c.id}
              onClick={() => setCuisineFilter(c.id)}
              className={
                "rounded-full px-2.5 py-0.5 text-xs transition " +
                (cuisineFilter === c.id
                  ? "bg-amber-600 text-white font-medium dark:bg-amber-700"
                  : "bg-muted/80 text-muted-foreground hover:bg-muted")
              }
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      <TooltipProvider>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((d) => {
            const total = d.protein * 4 + d.carbs * 4 + d.fat * 9 || 1;
            const p = (d.protein * 4 / total) * 100;
            const c = (d.carbs * 4 / total) * 100;
            const isCustom = "custom" in d && Boolean((d as { custom?: boolean }).custom);
            const isBuiltIn = DISHES.some((x) => x.id === d.id);
            const fav = isFavorite(d.id);
            const base = getDishBase(d);
            const cuisineName = d.cuisine ? CUISINE_LABELS[d.cuisine] : null;

            return (
              <Card key={d.id} className="relative group transition-shadow hover:shadow-md">
                <CardContent className="space-y-3 p-4 flex flex-col justify-between h-full">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => setDetail(d)} className="flex items-start gap-3 text-left flex-1 min-w-0">
                        <span className="text-3xl shrink-0">{d.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base flex items-center gap-1.5 truncate">
                            <span className="truncate">{d.name}</span>
                            {isCustom && (
                              <span className="shrink-0 rounded-full bg-accent/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">
                                {isBuiltIn ? "edited" : "yours"}
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground truncate mt-0.5">
                            {d.slots.join(" · ")} · <span className="font-medium text-foreground">{d.kcal} kcal</span>
                          </div>
                        </div>
                      </button>

                      <button
                        onClick={() => toggleFavorite(d.id)}
                        className={`p-1.5 rounded-full transition-colors ${fav ? "text-rose-600 bg-rose-50 dark:bg-rose-950/30" : "text-muted-foreground hover:text-rose-500"}`}
                        title={fav ? "Remove favorite" : "Mark favorite"}
                      >
                        <Heart className={`h-4 w-4 ${fav ? "fill-current" : ""}`} />
                      </button>
                    </div>

                    <div className="flex flex-wrap gap-1 items-center">
                      {cuisineName && (
                        <Badge variant="default" className="text-[10px] bg-amber-600 dark:bg-amber-700 py-0">
                          {cuisineName}
                        </Badge>
                      )}
                      <Badge variant="secondary" className="text-[10px] py-0">
                        {base}
                      </Badge>
                      {d.prepMinutes && <Badge variant="outline" className="text-[10px] py-0">⏱ {d.prepMinutes}m</Badge>}
                      {typeof d.spiceLevel === "number" && d.spiceLevel > 0 && (
                        <Badge variant="outline" className="text-[10px] py-0">{"🌶".repeat(d.spiceLevel)}</Badge>
                      )}
                    </div>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="cursor-help space-y-1">
                          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
                            <div style={{ width: `${p}%`, background: "var(--color-primary)" }} />
                            <div style={{ width: `${c}%`, background: "var(--color-accent)" }} />
                            <div style={{ flex: 1, background: "var(--color-success)" }} />
                          </div>
                          <div className="flex justify-between text-xs text-muted-foreground font-mono">
                            <span>P: {d.protein}g</span>
                            <span>C: {d.carbs}g</span>
                            <span>F: {d.fat}g</span>
                          </div>
                        </div>
                      </TooltipTrigger>
                      <TooltipContent>
                        Macro split: {Math.round(p)}% Protein, {Math.round(c)}% Carbs, {Math.round(100 - p - c)}% Fat
                      </TooltipContent>
                    </Tooltip>
                  </div>

                  <div className="flex gap-2 pt-2 border-t mt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => {
                        setEditingDish(d);
                        setShowAdd(false);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => setDetail(d)}
                    >
                      View Details
                    </Button>
                    {isCustom && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-destructive hover:bg-destructive/10"
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
      </TooltipProvider>

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

  const [cuisine, setCuisine] = useState<Cuisine | "">(initialDish?.cuisine ?? "");
  const [cookingType, setCookingType] = useState<CookingType | "">(initialDish?.cookingType ?? "");
  const [equipment, setEquipment] = useState<Equipment[]>(initialDish?.equipment ?? []);
  const [prepMinutes, setPrepMinutes] = useState<number>(initialDish?.prepMinutes ?? 25);
  const [spiceLevel, setSpiceLevel] = useState<0 | 1 | 2 | 3>(initialDish?.spiceLevel ?? 1);

  const toggleSlot = (s: Slot) =>
    setSlots((prev) => (prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]));

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
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label>Dish Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Paneer Butter Masala + Roti" />
          </div>
          <div>
            <Label>Emoji</Label>
            <Input value={emoji} onChange={(e) => setEmoji(e.target.value)} placeholder="🧀" />
          </div>
        </div>

        <div className="grid gap-4 grid-cols-4">
          <div>
            <Label>Calories</Label>
            <Input type="number" value={kcal} onChange={(e) => setKcal(Number(e.target.value))} />
          </div>
          <div>
            <Label>Protein (g)</Label>
            <Input type="number" value={protein} onChange={(e) => setProtein(Number(e.target.value))} />
          </div>
          <div>
            <Label>Carbs (g)</Label>
            <Input type="number" value={carbs} onChange={(e) => setCarbs(Number(e.target.value))} />
          </div>
          <div>
            <Label>Fat (g)</Label>
            <Input type="number" value={fat} onChange={(e) => setFat(Number(e.target.value))} />
          </div>
        </div>

        <div>
          <Label className="mb-1 block">Slots</Label>
          <div className="flex gap-2">
            {(["breakfast", "lunch", "dinner"] as Slot[]).map((s) => (
              <Button
                key={s}
                type="button"
                variant={slots.includes(s) ? "default" : "outline"}
                size="sm"
                onClick={() => toggleSlot(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t">
          {onCancel && (
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button onClick={submit}>{submitLabel}</Button>
        </div>
      </CardContent>
    </Card>
  );
}