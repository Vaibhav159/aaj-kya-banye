import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
      { title: "Custom Rules · Thali" },
      { name: "description", content: "Create your own dietary rules — filter dishes by cuisine, cooking style, equipment, prep time and more." },
      { property: "og:title", content: "Custom Rules · Thali" },
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
            onLabelChange={(label) => update(r.id, { label })}
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
  onLabelChange,
}: {
  rule: CustomRule;
  onToggle: () => void;
  onRemove: () => void;
  onLabelChange: (l: string) => void;
}) {
  const kindColor: Record<RuleKind, string> = {
    avoid: "bg-destructive/15 text-destructive",
    prefer: "bg-primary/15 text-primary",
    require: "bg-success/15 text-success",
  };
  const m = rule.match;
  const bits = [
    m.cuisine,
    m.cookingType,
    m.equipment && `needs ${m.equipment}`,
    m.tag && `tag: ${m.tag}`,
    m.maxPrepMinutes && `≤ ${m.maxPrepMinutes} min`,
    m.maxSpice !== undefined && `spice ≤ ${m.maxSpice}`,
  ].filter(Boolean);
  return (
    <Card className={rule.enabled ? "" : "opacity-60"}>
      <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 p-4">
        <div className="min-w-0 space-y-1">
          <Input
            value={rule.label}
            onChange={(e) => onLabelChange(e.target.value)}
            className="border-transparent bg-transparent px-0 text-base font-medium shadow-none focus-visible:border-input focus-visible:bg-background"
          />
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className={`rounded-full px-2 py-0.5 font-medium capitalize ${kindColor[rule.kind]}`}>{rule.kind}</span>
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
          <Button size="sm" variant="ghost" onClick={onRemove}>✕</Button>
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

  const submit = () => {
    if (!label.trim()) return;
    const match: CustomRule["match"] = {};
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
          <Sel label="Kind" value={kind} onChange={(v) => setKind(v as RuleKind)} options={["avoid", "prefer", "require"]} />
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
        <div className="space-y-1.5">
          <Label className="text-xs uppercase tracking-wide text-muted-foreground">Value</Label>
          <Sel label="" value={value} onChange={setValue} options={options} />
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