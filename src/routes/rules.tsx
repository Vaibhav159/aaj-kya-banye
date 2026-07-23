import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Pencil, Trash2 } from "lucide-react";
import {
  RULE_FIELD_OPTIONS,
  useCustomRules,
  countMatchingDishes,
  type CustomRule,
  type RuleKind,
  type RuleScope,
} from "@/lib/custom-rules";
import { DISHES } from "@/lib/dishes";

export const Route = createFileRoute("/rules")({
  head: () => ({
    meta: [
      { title: "Custom Rules · Aaj Kya Banaye?" },
      { name: "description", content: "Create your own dietary rules — filter dishes by cuisine, cooking style, equipment, prep time and more." },
      { property: "og:title", content: "Custom Rules · Aaj Kya Banaye?" },
      { property: "og:description", content: "Personal dietary rules for your meal plan." },
    ],
  }),
  component: RulesPage,
});

function RulesPage() {
  const { rules, add, update, remove, toggle } = useCustomRules();
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4">
        <div className="min-w-0">
          <p className="text-sm uppercase tracking-wide text-muted-foreground">Custom Rules</p>
          <h1 className="truncate font-display text-3xl sm:text-4xl font-semibold">Your dietary config</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Rules filter swap suggestions and the "Decide for me" picker. Toggle any on/off.
          </p>
        </div>
        <Button onClick={() => setShowForm((s) => !s)}>{showForm ? "Close" : "+ Rule"}</Button>
      </header>

      {showForm && (
        <RuleForm
          onAdd={(r) => {
            add(r);
            toast.success("Rule added");
            setShowForm(false);
          }}
        />
      )}

      <div className="space-y-3">
        {rules.map((r) => (
          <RuleRow
            key={r.id}
            rule={r}
            onToggle={() => toggle(r.id)}
            onRemove={() => remove(r.id)}
            onUpdate={(patch) => update(r.id, patch)}
          />
        ))}
        {rules.length === 0 && (
          <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No custom rules yet. Try one: "Airfryer-only dinners", "No fried food", or "Prep ≤ 20 min".
          </p>
        )}
      </div>
    </div>
  );
}

function RuleRow({
  rule,
  onToggle,
  onRemove,
  onUpdate,
}: {
  rule: CustomRule;
  onToggle: () => void;
  onRemove: () => void;
  onUpdate: (patch: Partial<CustomRule>) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(rule.label);
  const [kind, setKind] = useState<RuleKind>(rule.kind);
  const [scope, setScope] = useState<RuleScope>(rule.scope);

  const getInitialField = () => {
    if (rule.kind === "no-repeat") return "minDaysBetweenRepeat";
    if (rule.kind === "lighter-dinner") return "maxKcalDifference";
    if (rule.match.minProtein !== undefined) return "minProtein";
    if (rule.match.maxCarbs !== undefined) return "maxCarbs";
    if (rule.match.maxKcal !== undefined) return "maxKcal";
    if (rule.match.tags !== undefined) return "tags";
    if (rule.match.minDaysBetweenRepeat !== undefined) return "minDaysBetweenRepeat";
    if (rule.match.maxKcalDifference !== undefined) return "maxKcalDifference";

    return (Object.keys(rule.match).find(
      (k) => k !== "frequencyLimit"
    ) as any) || "cookingType";
  };

  const [field, setField] = useState<string>(getInitialField());
  const [value, setValue] = useState<string>(() => {
    const f = getInitialField();
    if (f === "tags") return (rule.match.tags ?? []).join(",");
    return String(rule.match[f as keyof typeof rule.match] ?? "fried");
  });
  const [freqLimit, setFreqLimit] = useState(
    String(rule.match.frequencyLimit ?? 2)
  );

  const save = () => {
    if (!label.trim()) return;
    const match: CustomRule["match"] = {};
    if (kind === "min-frequency" || kind === "max-frequency") {
      match.frequencyLimit = Number(freqLimit);
    }

    const currentField = kind === "no-repeat" ? "minDaysBetweenRepeat" : kind === "lighter-dinner" ? "maxKcalDifference" : field;

    if (currentField === "maxPrepMinutes") match.maxPrepMinutes = Number(value);
    else if (currentField === "maxSpice") match.maxSpice = Number(value) as 0 | 1 | 2 | 3;
    else if (currentField === "cuisine") match.cuisine = value as never;
    else if (currentField === "cookingType") match.cookingType = value as never;
    else if (currentField === "equipment") match.equipment = value as never;
    else if (currentField === "tag") match.tag = value as never;
    else if (currentField === "tags") match.tags = value.split(",").map(s => s.trim()) as never;
    else if (currentField === "minProtein") match.minProtein = Number(value);
    else if (currentField === "maxCarbs") match.maxCarbs = Number(value);
    else if (currentField === "maxKcal") match.maxKcal = Number(value);
    else if (currentField === "minDaysBetweenRepeat") match.minDaysBetweenRepeat = Number(value);
    else if (currentField === "maxKcalDifference") match.maxKcalDifference = Number(value);

    onUpdate({ label: label.trim(), kind, scope, match });
    setIsEditing(false);
    toast.success("Rule updated");
  };

  const cancel = () => {
    setLabel(rule.label);
    setKind(rule.kind);
    setScope(rule.scope);
    const f = getInitialField();
    setField(f);
    setValue(f === "tags" ? (rule.match.tags ?? []).join(",") : String(rule.match[f as keyof typeof rule.match] ?? "fried"));
    setFreqLimit(String(rule.match.frequencyLimit ?? 2));
    setIsEditing(false);
  };

  const kindColor: Record<RuleKind, string> = {
    avoid: "bg-destructive/15 text-destructive",
    prefer: "bg-primary/15 text-primary",
    require: "bg-success/15 text-success",
    "min-frequency": "bg-warning/15 text-foreground/80 dark:text-warning",
    "max-frequency": "bg-warning/15 text-foreground/80 dark:text-warning",
    "no-repeat": "bg-info/15 text-foreground/80 dark:text-info bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    "lighter-dinner": "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  };

  if (isEditing) {
    const currentField = kind === "no-repeat" ? "minDaysBetweenRepeat" : kind === "lighter-dinner" ? "maxKcalDifference" : field;

    const getOptions = () => {
      if (currentField === "maxPrepMinutes") return ["10", "15", "20", "30", "45", "60"];
      if (currentField === "maxSpice") return ["0", "1", "2", "3"];
      if (currentField === "minProtein") return ["10", "15", "20", "25", "30", "35", "40"];
      if (currentField === "maxCarbs") return ["30", "40", "50", "60", "70", "80", "100"];
      if (currentField === "maxKcal") return ["300", "400", "450", "500", "600", "700", "800"];
      if (currentField === "minDaysBetweenRepeat") return ["1", "2", "3", "4", "5", "6", "7"];
      if (currentField === "maxKcalDifference") return ["-100", "-50", "0", "50", "100", "150", "200"];
      if (currentField === "tags") return ["dal,legume", "sweet", "light", "pizza", "paratha", "fried-breakfast", "leafy"];
      return (RULE_FIELD_OPTIONS[currentField as keyof typeof RULE_FIELD_OPTIONS] || []) as string[];
    };

    const isFixedField = kind === "no-repeat" || kind === "lighter-dinner";

    return (
      <Card className="border border-primary/40 bg-card/60">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Sel label="Kind" value={kind} onChange={(v) => {
              const nextKind = v as RuleKind;
              setKind(nextKind);
              if (nextKind === "no-repeat") {
                setValue("3");
              } else if (nextKind === "lighter-dinner") {
                setValue("0");
              }
            }} options={["avoid", "prefer", "require", "min-frequency", "max-frequency", "no-repeat", "lighter-dinner"]} />
            <Sel label="Applies to" value={scope} onChange={(v) => setScope(v as RuleScope)} options={["any", "breakfast", "lunch", "dinner"]} />
            {!isFixedField ? (
              <Sel
                label="Field"
                value={field}
                onChange={(v) => {
                  setField(v);
                  if (v === "maxPrepMinutes") setValue("20");
                  else if (v === "maxSpice") setValue("1");
                  else if (v === "minProtein") setValue("20");
                  else if (v === "maxCarbs") setValue("50");
                  else if (v === "maxKcal") setValue("500");
                  else if (v === "tags") setValue("dal,legume");
                  else setValue((RULE_FIELD_OPTIONS[v as "cuisine"] as string[])[0]);
                }}
                options={["cuisine", "cookingType", "equipment", "tag", "tags", "maxPrepMinutes", "maxSpice", "minProtein", "maxCarbs", "maxKcal"]}
              />
            ) : (
              <div className="space-y-1.5 opacity-50">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Field</Label>
                <div className="h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm capitalize">
                  {currentField.replace(/([A-Z])/g, " $1")}
                </div>
              </div>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Value</Label>
              <Sel label="" value={value} onChange={setValue} options={getOptions()} />
            </div>
            {(kind === "min-frequency" || kind === "max-frequency") && (
              <div className="space-y-1.5">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">Times per week</Label>
                <Sel label="" value={freqLimit} onChange={setFreqLimit} options={["1", "2", "3", "4", "5", "6", "7"]} />
              </div>
            )}
          </div>
          <div className="flex gap-2 justify-end pt-2 border-t">
            <Button size="sm" onClick={save} disabled={!label.trim()}>Save</Button>
            <Button size="sm" variant="outline" onClick={cancel}>Cancel</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const m = rule.match;
  const bits = [
    m.cuisine,
    m.cookingType,
    m.equipment && `needs ${m.equipment}`,
    m.tag && `tag: ${m.tag}`,
    m.tags && `tags: ${m.tags.join(" or ")}`,
    m.maxPrepMinutes && `≤ ${m.maxPrepMinutes} min`,
    m.maxSpice !== undefined && `spice ≤ ${m.maxSpice}`,
    m.minProtein !== undefined && `protein ≥ ${m.minProtein}g`,
    m.maxCarbs !== undefined && `carbs ≤ ${m.maxCarbs}g`,
    m.maxKcal !== undefined && `kcal ≤ ${m.maxKcal}`,
    m.minDaysBetweenRepeat !== undefined && `${m.minDaysBetweenRepeat} days min`,
    m.maxKcalDifference !== undefined && `diff ≤ ${m.maxKcalDifference} kcal`,
    m.frequencyLimit !== undefined && `limit: ${m.frequencyLimit}×/week`,
  ].filter(Boolean);

  return (
    <Card className={rule.enabled ? "" : "opacity-60"}>
      <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <div className="text-base font-semibold text-foreground py-0.5">{rule.label}</div>
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium capitalize ${kindColor[rule.kind]}`}>{rule.kind.replace(/-/g, " ")}</span>
            <span className="rounded-full bg-secondary px-2 py-0.5 capitalize text-secondary-foreground">{rule.scope}</span>
            {bits.map((b, i) => (
              <span key={i} className="rounded-full border border-border px-2 py-0.5 text-muted-foreground">{b}</span>
            ))}
            <MatchCount rule={rule} />
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" variant={rule.enabled ? "default" : "outline"} onClick={onToggle}>
            {rule.enabled ? "On" : "Off"}
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditing(true)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={onRemove}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** ponytail: live dish-match indicator. Tells users when rules are vacuous or too tight. */
function MatchCount({ rule }: { rule: CustomRule }) {
  // Only meaningful for rules that filter on dish properties
  if (rule.kind === "no-repeat" || rule.kind === "lighter-dinner") return null;

  const count = countMatchingDishes(rule.match, rule.scope, DISHES);
  const color =
    count === 0
      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
      : count <= 5
        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
        : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";

  return (
    <span className={`rounded-full px-2 py-0.5 font-medium ${color}`}>
      {count === 0 ? "0 dishes — no effect" : `${count} dish${count > 1 ? "es" : ""}`}
    </span>
  );
}

function RuleForm({ onAdd }: { onAdd: (r: Omit<CustomRule, "id">) => void }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<RuleKind>("avoid");
  const [scope, setScope] = useState<RuleScope>("any");
  const [field, setField] = useState<string>("cookingType");
  const [value, setValue] = useState<string>("fried");
  const [freqLimit, setFreqLimit] = useState("2");

  const submit = () => {
    if (!label.trim()) return;
    const match: CustomRule["match"] = {};
    if (kind === "min-frequency" || kind === "max-frequency") {
      match.frequencyLimit = Number(freqLimit);
    }

    const currentField = kind === "no-repeat" ? "minDaysBetweenRepeat" : kind === "lighter-dinner" ? "maxKcalDifference" : field;

    if (currentField === "maxPrepMinutes") match.maxPrepMinutes = Number(value);
    else if (currentField === "maxSpice") match.maxSpice = Number(value) as 0 | 1 | 2 | 3;
    else if (currentField === "cuisine") match.cuisine = value as never;
    else if (currentField === "cookingType") match.cookingType = value as never;
    else if (currentField === "equipment") match.equipment = value as never;
    else if (currentField === "tag") match.tag = value as never;
    else if (currentField === "tags") match.tags = value.split(",").map(s => s.trim()) as never;
    else if (currentField === "minProtein") match.minProtein = Number(value);
    else if (currentField === "maxCarbs") match.maxCarbs = Number(value);
    else if (currentField === "maxKcal") match.maxKcal = Number(value);
    else if (currentField === "minDaysBetweenRepeat") match.minDaysBetweenRepeat = Number(value);
    else if (currentField === "maxKcalDifference") match.maxKcalDifference = Number(value);

    onAdd({ label: label.trim(), kind, scope, match, enabled: true });
  };

  const currentField = kind === "no-repeat" ? "minDaysBetweenRepeat" : kind === "lighter-dinner" ? "maxKcalDifference" : field;

  const getOptions = () => {
    if (currentField === "maxPrepMinutes") return ["10", "15", "20", "30", "45", "60"];
    if (currentField === "maxSpice") return ["0", "1", "2", "3"];
    if (currentField === "minProtein") return ["10", "15", "20", "25", "30", "35", "40"];
    if (currentField === "maxCarbs") return ["30", "40", "50", "60", "70", "80", "100"];
    if (currentField === "maxKcal") return ["300", "400", "450", "500", "600", "700", "800"];
    if (currentField === "minDaysBetweenRepeat") return ["1", "2", "3", "4", "5", "6", "7"];
    if (currentField === "maxKcalDifference") return ["-100", "-50", "0", "50", "100", "150", "200"];
    if (currentField === "tags") return ["dal,legume", "sweet", "light", "pizza", "paratha", "fried-breakfast", "leafy"];
    return (RULE_FIELD_OPTIONS[currentField as keyof typeof RULE_FIELD_OPTIONS] || []) as string[];
  };

  const isFixedField = kind === "no-repeat" || kind === "lighter-dinner";

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">New rule</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Airfryer-only dinners" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Sel label="Kind" value={kind} onChange={(v) => {
            const nextKind = v as RuleKind;
            setKind(nextKind);
            if (nextKind === "no-repeat") {
              setValue("3");
            } else if (nextKind === "lighter-dinner") {
              setValue("0");
            }
          }} options={["avoid", "prefer", "require", "min-frequency", "max-frequency", "no-repeat", "lighter-dinner"]} />
          <Sel label="Applies to" value={scope} onChange={(v) => setScope(v as RuleScope)} options={["any", "breakfast", "lunch", "dinner"]} />
          {!isFixedField ? (
            <Sel
              label="Field"
              value={field}
              onChange={(v) => {
                setField(v);
                if (v === "maxPrepMinutes") setValue("20");
                else if (v === "maxSpice") setValue("1");
                else if (v === "minProtein") setValue("20");
                else if (v === "maxCarbs") setValue("50");
                else if (v === "maxKcal") setValue("500");
                else if (v === "tags") setValue("dal,legume");
                else setValue((RULE_FIELD_OPTIONS[v as "cuisine"] as string[])[0]);
              }}
              options={["cuisine", "cookingType", "equipment", "tag", "tags", "maxPrepMinutes", "maxSpice", "minProtein", "maxCarbs", "maxKcal"]}
            />
          ) : (
            <div className="space-y-1.5 opacity-50">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Field</Label>
              <div className="h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm capitalize">
                {currentField.replace(/([A-Z])/g, " $1")}
              </div>
            </div>
          )}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Value</Label>
            <Sel label="" value={value} onChange={setValue} options={getOptions()} />
          </div>
          {(kind === "min-frequency" || kind === "max-frequency") && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Times per week</Label>
              <Sel label="" value={freqLimit} onChange={setFreqLimit} options={["1", "2", "3", "4", "5", "6", "7"]} />
            </div>
          )}
        </div>
        <Button onClick={submit} disabled={!label.trim()}>Add rule</Button>
      </CardContent>
    </Card>
  );
}

function Sel({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <div className="space-y-1.5">
      {label && <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm capitalize"
      >
        {options.map((o) => (
          <option key={o} value={o}>{o.replace(/-/g, " ")}</option>
        ))}
      </select>
    </div>
  );
}