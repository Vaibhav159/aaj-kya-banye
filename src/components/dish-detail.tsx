import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_EMOJI, CUISINE_LABELS, getDishBase, type Dish } from "@/lib/dishes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useFavorites } from "@/lib/store";
import { Heart, SlidersHorizontal } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavigate } from "@tanstack/react-router";

export function DishDetailDialog({
  dish,
  open,
  onOpenChange,
}: {
  dish: Dish | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { isFavorite, toggleFavorite } = useFavorites();
  const navigate = useNavigate();

  if (!dish) return null;
  const fav = isFavorite(dish.id);
  const base = getDishBase(dish);
  const cuisineName = dish.cuisine ? CUISINE_LABELS[dish.cuisine] || dish.cuisine : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pr-6">
          <div className="flex items-start justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 font-display text-2xl">
              <span className="text-3xl">{dish.emoji}</span> {dish.name}
            </DialogTitle>
            <Button
              variant="outline"
              size="icon"
              className={`h-9 w-9 shrink-0 rounded-full transition-colors ${fav ? "border-rose-300 bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400" : "text-muted-foreground"}`}
              onClick={() => toggleFavorite(dish.id)}
              title={fav ? "Remove from favorites" : "Add to favorites"}
            >
              <Heart className={`h-5 w-5 ${fav ? "fill-current" : ""}`} />
            </Button>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-1.5 items-center">
            {cuisineName && (
              <Badge variant="default" className="bg-amber-950 text-amber-50 dark:bg-amber-900/50 dark:text-amber-200 border border-amber-800 dark:border-amber-700/60">
                🗺️ {cuisineName}
              </Badge>
            )}
            <Badge variant="secondary" className="bg-primary/10 text-primary font-medium">
              🍞 {base}
            </Badge>
            {dish.slots.map((s) => (
              <Badge key={s} variant="outline" className="capitalize">{s}</Badge>
            ))}
            {dish.tags.map((t) => (
              <Badge key={t} variant="outline" className="capitalize">{t}</Badge>
            ))}
            {dish.cookingType && <Badge variant="outline">{dish.cookingType.replace("-", " ")}</Badge>}
            {dish.prepMinutes ? <Badge variant="outline">⏱ {dish.prepMinutes} min</Badge> : null}
            {typeof dish.spiceLevel === "number" && dish.spiceLevel > 0 && (
              <Badge variant="outline">{"🌶".repeat(dish.spiceLevel)}</Badge>
            )}
          </div>

          {dish.equipment && dish.equipment.length > 0 && (
            <div className="text-xs text-muted-foreground">
              <span className="font-semibold uppercase tracking-wide">Needs:</span>{" "}
              {dish.equipment.join(" · ")}
            </div>
          )}

          <TooltipProvider>
            <div className="grid grid-cols-4 gap-2 text-center">
              <Stat label="kcal" value={dish.kcal} tooltip="Total estimated energy" />
              <Stat label="Protein" value={`${dish.protein}g`} tooltip="Builds & repairs tissue" />
              <Stat label="Carbs" value={`${dish.carbs}g`} tooltip="Primary energy source" />
              <Stat label="Fat" value={`${dish.fat}g`} tooltip="Essential healthy fats" />
            </div>
          </TooltipProvider>

          <div className="flex gap-2">
            {dish.recipeUrl && (
              <a href={dish.recipeUrl} target="_blank" rel="noopener noreferrer" className="flex-1">
                <Button className="w-full" variant="outline">▶ Watch recipe</Button>
              </a>
            )}
            <Button
              variant="outline"
              className="flex-1 gap-1.5"
              onClick={() => {
                onOpenChange(false);
                navigate({ to: "/rules" });
              }}
            >
              <SlidersHorizontal className="h-4 w-4" /> Add Rule for Dish
            </Button>
          </div>

          {dish.ingredients.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Ingredients</div>
              <ul className="space-y-1 text-sm">
                {dish.ingredients.map((ing) => (
                  <li key={ing.name + ing.unit} className="flex items-center justify-between border-b border-dashed border-border/60 py-1">
                    <span className="flex items-center gap-2">
                      <span>{CATEGORY_EMOJI[ing.category]}</span>
                      <span>{ing.name}</span>
                    </span>
                    <span className="tabular-nums text-muted-foreground">{ing.qty}{ing.unit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tooltip }: { label: string; value: string | number; tooltip?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="rounded-md bg-muted px-2 py-2 cursor-help transition-colors hover:bg-muted/80">
          <div className="text-sm font-semibold text-foreground">{value}</div>
          <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
        </div>
      </TooltipTrigger>
      {tooltip && <TooltipContent>{tooltip}</TooltipContent>}
    </Tooltip>
  );
}