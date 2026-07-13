import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORY_EMOJI, type Dish } from "@/lib/dishes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function DishDetailDialog({
  dish,
  open,
  onOpenChange,
}: {
  dish: Dish | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        {dish && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 font-display text-2xl">
                <span className="text-3xl">{dish.emoji}</span> {dish.name}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="flex flex-wrap gap-1.5">
                {dish.slots.map((s) => (
                  <Badge key={s} variant="secondary" className="capitalize">{s}</Badge>
                ))}
                {dish.tags.map((t) => (
                  <Badge key={t} variant="outline" className="capitalize">{t}</Badge>
                ))}
                {dish.cuisine && <Badge variant="outline">{dish.cuisine.replace("-", " ")}</Badge>}
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
              <div className="grid grid-cols-4 gap-2 text-center">
                <Stat label="kcal" value={dish.kcal} />
                <Stat label="Protein" value={`${dish.protein}g`} />
                <Stat label="Carbs" value={`${dish.carbs}g`} />
                <Stat label="Fat" value={`${dish.fat}g`} />
              </div>
              {dish.recipeUrl && (
                <a href={dish.recipeUrl} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full" variant="outline">▶ Watch recipe</Button>
                </a>
              )}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-muted px-2 py-2">
      <div className="text-sm font-semibold text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}