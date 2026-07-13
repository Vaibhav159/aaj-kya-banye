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
  type CustomRule,
  type RuleKind,
  type RuleScope,
} from "@/lib/custom-rules";

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

  const initialField = Object.keys(rule.match).find(
    (k) => k !== "frequencyLimit"
  ) as "cuisine" | "cookingType" | "equipment" | "tag" | "maxPrepMinutes" | "maxSpice" | undefined;

  const [field, setField] = useState<"cuisine" | "cookingType" | "equipment" | "tag" | "maxPrepMinutes" | "maxSpice">(initialField ?? "cookingType");
  const [value, setValue] = useState<string>(
    initialField ? String(rule.match[initialField]) : "fried"
  );
  const [freqLimit, setFreqLimit] = useState(
    String(rule.match.frequencyLimit ?? 2)
  );

  const save = () => {
    if (!label.trim()) return;
    const match: CustomRule["match"] = {};
    if (kind === "min-frequency" || kind === "max-frequency") {
      match.frequencyLimit = Number(freqLimit);
    }
    if (field === "maxPrepMinutes") match.maxPrepMinutes = Number(value);
    else if (field === "maxSpice") match.maxSpice = Number(value) as 0 | 1 | 2 | 3;
    else if (field === "cuisine") match.cuisine = value as never;
    else if (field === "cookingType") match.cookingType = value as never;
    else if (field === "equipment") match.equipment = value as never;
    else if (field === "tag") match.tag = value as never;

    onUpdate({ label: label.trim(), kind, scope, match });
    setIsEditing(false);
    toast.success("Rule updated");
  };

  const cancel = () => {
    setLabel(rule.label);
    setKind(rule.kind);
    setScope(rule.scope);
    setField(initialField ?? "cookingType");
    setValue(initialField ? String(rule.match[initialField]) : "fried");
    setFreqLimit(String(rule.match.frequencyLimit ?? 2));
    setIsEditing(false);
  };

  const kindColor: Record<RuleKind, string> = {
    avoid: "bg-destructive/15 text-destructive",
    prefer: "bg-primary/15 text-primary",
    require: "bg-success/15 text-success",
    "min-frequency": "bg-warning/15 text-foreground/80 dark:text-warning",
    "max-frequency": "bg-warning/15 text-foreground/80 dark:text-warning",
  };

  if (isEditing) {
    const options: string[] =
      field === "maxPrepMinutes"
        ? ["10", "15", "20", "30", "45"]
        : field === "maxSpice"
          ? ["0", "1", "2", "3"]
          : (RULE_FIELD_OPTIONS[field] as string[]);

    return (
      <Card className="border border-primary/40 bg-card/60">
        <CardContent className="space-y-4 p-4">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Label</Label>
            <Input value={label} onChange={(e) => setLabel(e.target.value)} />
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            <Sel label="Kind" value={kind} onChange={(v) => setKind(v as RuleKind)} options={["avoid", "prefer", "require", "min-frequency", "max-frequency"]} />
            <Sel label="Applies to" value={scope} onChange={(v) => setScope(v as RuleScope)} options={["any", "breakfast", "lunch", "dinner"]} />
            <Sel
              label="Field"
              value={field}
              onChange={(v) => {
                const f = v as typeof field;
                setField(f);
                setValue(
                  f === "maxPrepMinutes" ? "20" : f === "maxSpice" ? "1" : (RULE_FIELD_OPTIONS[f as "cuisine"] as string[])[0],
                );
              }}
              options={["cuisine", "cookingType", "equipment", "tag", "maxPrepMinutes", "maxSpice"]}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">Value</Label>
              <Sel label="" value={value} onChange={setValue} options={options} />
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
    m.maxPrepMinutes && `≤ ${m.maxPrepMinutes} min`,
    m.maxSpice !== undefined && `spice ≤ ${m.maxSpice}`,
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

function RuleForm({ onAdd }: { onAdd: (r: Omit<CustomRule, "id">) => void }) {
  const [label, setLabel] = useState("");
  const [kind, setKind] = useState<RuleKind>("avoid");
  const [scope, setScope] = useState<RuleScope>("any");
  const [field, setField] = useState<"cuisine" | "cookingType" | "equipment" | "tag" | "maxPrepMinutes" | "maxSpice">("cookingType");
  const [value, setValue] = useState<string>("fried");
  const [freqLimit, setFreqLimit] = useState("2");

  const submit = () => {
    if (!label.trim()) return;
    const match: CustomRule["match"] = {};
    if (kind === "min-frequency" || kind === "max-frequency") {
      match.frequencyLimit = Number(freqLimit);
    }
    if (field === "maxPrepMinutes") match.maxPrepMinutes = Number(value);
    else if (field === "maxSpice") match.maxSpice = Number(value) as 0 | 1 | 2 | 3;
    else if (field === "cuisine") match.cuisine = value as never;
    else if (field === "cookingType") match.cookingType = value as never;
    else if (field === "equipment") match.equipment = value as never;
    else if (field === "tag") match.tag = value as never;
    onAdd({ label: label.trim(), kind, scope, match, enabled: true });
  };

  const options: string[] =
    field === "maxPrepMinutes"
      ? ["10", "15", "20", "30", "45"]
      : field === "maxSpice"
        ? ["0", "1", "2", "3"]
        : (RULE_FIELD_OPTIONS[field] as string[]);

  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">New rule</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Label</Label>
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Airfryer-only dinners" />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <Sel label="Kind" value={kind} onChange={(v) => setKind(v as RuleKind)} options={["avoid", "prefer", "require", "min-frequency", "max-frequency"]} />
          <Sel label="Applies to" value={scope} onChange={(v) => setScope(v as RuleScope)} options={["any", "breakfast", "lunch", "dinner"]} />
          <Sel
            label="Field"
            value={field}
            onChange={(v) => {
              const f = v as typeof field;
              setField(f);
              setValue(
                f === "maxPrepMinutes" ? "20" : f === "maxSpice" ? "1" : (RULE_FIELD_OPTIONS[f as "cuisine"] as string[])[0],
              );
            }}
            options={["cuisine", "cookingType", "equipment", "tag", "maxPrepMinutes", "maxSpice"]}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Value</Label>
            <Sel label="" value={value} onChange={setValue} options={options} />
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