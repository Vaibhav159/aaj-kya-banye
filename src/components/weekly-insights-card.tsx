import { useMemo } from "react";
import { Sparkles, CheckCircle2, AlertTriangle, Lightbulb, Utensils, Dumbbell, ShieldAlert, Leaf, Check } from "lucide-react";
import { type DayPlan } from "@/lib/plan";
import { useCustomRules } from "@/lib/custom-rules";
import { useProfile } from "@/lib/store";
import { generateWeeklyInsights } from "@/lib/weekly-insights";

interface WeeklyAIInsightsCardProps {
  plan: DayPlan[];
  dayIdx: number;
}

export function WeeklyAIInsightsCard({ plan, dayIdx }: WeeklyAIInsightsCardProps) {
  const { rules: customRules } = useCustomRules();
  const profile = useProfile();
  const targetProtein = profile?.goalProtein ?? 60;

  const insights = useMemo(() => {
    return generateWeeklyInsights(plan, dayIdx, customRules, targetProtein);
  }, [plan, dayIdx, customRules, targetProtein]);

  return (
    <div className="rounded-xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/[0.04] via-background to-purple-500/[0.06] p-5 shadow-xs transition-all">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-border/60 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
              THIS WEEK
            </div>
            <h3 className="font-display text-lg font-bold text-foreground leading-snug">
              Weekly AI Insights
            </h3>
          </div>
        </div>
        <span className="text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border border-indigo-500/20">
          7-Day Analysis
        </span>
      </div>

      {/* Grid Content */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left Column: You've Eaten & Preferences */}
        <div className="space-y-4">
          {/* You've Eaten */}
          <div className="rounded-lg bg-card/60 border border-border/50 p-3.5 space-y-2.5">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Utensils className="h-3.5 w-3.5 text-primary" />
              <span>You've planned:</span>
            </div>
            <div className="space-y-2 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-foreground/90 font-medium">
                  <Leaf className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                  Vegetables variety
                </span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                  {insights.uniqueVegCount} different vegetables
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-foreground/90 font-medium">
                  <Dumbbell className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  Protein goals achieved
                </span>
                <span className="font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
                  {insights.proteinGoalAchievedDays}/{insights.totalDays} days
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-foreground/90 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  Meal repetition
                </span>
                <span className="font-semibold text-foreground/90 tabular-nums">
                  {insights.repeatedMealsCount === 0
                    ? "No repeated meals"
                    : `${insights.repeatedMealsCount} repeated meal${insights.repeatedMealsCount > 1 ? "s" : ""}`}
                </span>
              </div>
            </div>
          </div>

          {/* You've Preferred */}
          <div className="rounded-lg bg-card/60 border border-border/50 p-3.5 space-y-2">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              You've preferred:
            </div>
            <ul className="space-y-1.5 text-xs sm:text-sm">
              {insights.preferences.map((pref, i) => (
                <li key={i} className="flex items-center gap-2 text-foreground/90">
                  <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                  <span className="font-medium text-foreground">{pref.label}</span>
                  <span className="text-muted-foreground text-[11px]">({pref.detail})</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right Column: Rule Violations & Suggestions */}
        <div className="space-y-4">
          {/* Rule Violations */}
          <div className="rounded-lg bg-card/60 border border-border/50 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
              <span>Rule Violations:</span>
            </div>
            {insights.ruleViolations.length > 0 ? (
              <ul className="space-y-1.5 text-xs sm:text-sm">
                {insights.ruleViolations.map((v, i) => (
                  <li key={i} className="flex items-start gap-2 text-rose-600 dark:text-rose-400">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    <span>
                      <strong className="font-semibold">{v.ruleName}</strong> ({v.count}x)
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-medium py-0.5">
                <Check className="h-4 w-4" />
                <span>All nutrition & balance rules passed!</span>
              </div>
            )}
          </div>

          {/* Suggestions */}
          <div className="rounded-lg bg-card/60 border border-border/50 p-3.5 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span>Suggestions:</span>
            </div>
            <ul className="space-y-2 text-xs sm:text-sm">
              {insights.suggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-foreground/90 leading-relaxed">
                  <span className="text-amber-500 font-bold shrink-0">•</span>
                  <span>{s.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
