import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useProfile, DEFAULT_PROFILE, calculateDailyGoals, type ActivityLevel, type GoalPace } from "@/lib/store";
import { useTheme, type ThemeMode } from "@/lib/theme";
import { Sparkles, ArrowRight, ArrowLeft, Check, Sun, Moon, Monitor, Clock, Target, User } from "lucide-react";
import { toast } from "sonner";

interface OnboardingDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function OnboardingDialog({ open: controlledOpen, onOpenChange }: OnboardingDialogProps) {
  const { profile, save: saveProfile, hydrated } = useProfile();
  const { theme, setTheme } = useTheme();
  
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form state
  const [name, setName] = useState("");
  const [weightKg, setWeightKg] = useState(70);
  const [targetKg, setTargetKg] = useState(68);
  const [heightCm, setHeightCm] = useState(170);
  const [age, setAge] = useState(28);
  const [gender, setGender] = useState<"male" | "female">("male");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("light");
  const [pace, setPace] = useState<GoalPace>("moderate");
  const [goalKcal, setGoalKcal] = useState(2000);
  const [breakfastTime, setBreakfastTime] = useState("08:00");
  const [lunchTime, setLunchTime] = useState("13:00");
  const [dinnerTime, setDinnerTime] = useState("20:00");
  const [selectedTheme, setSelectedTheme] = useState<ThemeMode>("system");

  useEffect(() => {
    if (hydrated) {
      if (controlledOpen !== undefined) {
        setIsOpen(controlledOpen);
      } else {
        const completed = localStorage.getItem("thali:onboardingCompleted");
        if (!completed) {
          setIsOpen(true);
        }
      }
    }
  }, [hydrated, controlledOpen]);

  useEffect(() => {
    if (profile) {
      setName(profile.name || "Friend");
      setWeightKg(profile.weightKg || 70);
      setTargetKg(profile.targetKg || 68);
      setHeightCm(profile.heightCm || 170);
      setAge(profile.age || 28);
      setGender(profile.gender || "male");
      setActivityLevel(profile.activityLevel || "light");
      setPace(profile.pace || "moderate");
      setGoalKcal(profile.goalKcal || 2000);
      setBreakfastTime(profile.breakfastTime || "08:00");
      setLunchTime(profile.lunchTime || "13:00");
      setDinnerTime(profile.dinnerTime || "20:00");
    }
    if (theme) {
      setSelectedTheme(theme);
    }
  }, [profile, theme]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    onOpenChange?.(open);
  };

  const handleFinish = () => {
    const goals = calculateDailyGoals({
      weightKg,
      targetKg,
      heightCm,
      age,
      gender,
      activityLevel,
      pace,
    });

    saveProfile({
      ...profile,
      name: name.trim() || "You",
      weightKg,
      targetKg,
      heightCm,
      age,
      gender,
      activityLevel,
      pace,
      goalKcal: goals.goalKcal,
      goalProtein: goals.goalProtein,
      goalCarbs: goals.goalCarbs,
      goalFat: goals.goalFat,
      breakfastTime,
      lunchTime,
      dinnerTime,
    });
    
    setTheme(selectedTheme);
    localStorage.setItem("thali:onboardingCompleted", "true");
    
    toast.success("Welcome aboard! Your meal planner is ready 🍛");
    handleOpenChange(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md p-6 overflow-hidden sm:rounded-2xl">
        <DialogHeader className="space-y-2 text-center sm:text-left">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-primary px-2.5 py-0.5 rounded-full bg-primary/10">
              Step {step} of 4
            </span>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    i === step ? "w-6 bg-primary" : i < step ? "w-2 bg-primary/50" : "w-2 bg-muted"
                  }`}
                />
              ))}
            </div>
          </div>
          
          <DialogTitle className="font-display text-2xl font-bold tracking-tight">
            {step === 1 && "Welcome to Aaj Kya Banaye! 🍛"}
            {step === 2 && "Your Health & Macro Goals 🎯"}
            {step === 3 && "Your Daily Meal Timings ⏰"}
            {step === 4 && "Choose Your App Theme 🎨"}
          </DialogTitle>

          <DialogDescription className="text-sm text-muted-foreground">
            {step === 1 && "Let's personalize your 42-day rotating Indian vegetarian meal planner in a few quick steps."}
            {step === 2 && "Set your weight targets and calorie budget to customize your nutrition breakdown."}
            {step === 3 && "Tell us when you usually eat so we can send timely meal reminders and alerts."}
            {step === 4 && "Pick how you'd like Aaj Kya Banaye to look on your screen."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4 min-h-[220px] flex flex-col justify-center">
          {/* STEP 1: Name & Welcome */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="onboarding-name" className="text-xs font-medium uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <User className="h-3.5 w-3.5 text-primary" /> What should we call you?
                </Label>
                <Input
                  id="onboarding-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Rahul, Priya, Alex"
                  className="h-11 rounded-xl text-base"
                  autoFocus
                />
              </div>
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border/50 text-xs text-muted-foreground leading-relaxed">
                ✨ <strong>No signup required!</strong> All your meal plans, custom rules, and log history stay saved locally in your browser.
              </div>
            </div>
          )}

          {/* STEP 2: Macros & Target Weight */}
          {step === 2 && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="current-weight" className="text-xs font-medium text-muted-foreground">Current Weight (kg)</Label>
                  <Input
                    id="current-weight"
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(Number(e.target.value) || 70)}
                    className="h-9 text-sm rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="target-weight" className="text-xs font-medium text-muted-foreground">Target Weight (kg)</Label>
                  <Input
                    id="target-weight"
                    type="number"
                    value={targetKg}
                    onChange={(e) => setTargetKg(Number(e.target.value) || 68)}
                    className="h-9 text-sm rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Gender</Label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as "male" | "female")}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2.5 text-xs"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Height (cm)</Label>
                  <Input
                    type="number"
                    value={heightCm}
                    onChange={(e) => setHeightCm(Number(e.target.value) || 170)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Age</Label>
                  <Input
                    type="number"
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value) || 28)}
                    className="h-9 text-xs rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Activity</Label>
                  <select
                    value={activityLevel}
                    onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
                  >
                    <option value="sedentary">Sedentary</option>
                    <option value="light">Lightly Active</option>
                    <option value="moderate">Moderately Active</option>
                    <option value="active">Very Active</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] font-medium text-muted-foreground">Goal Pace</Label>
                  <select
                    value={pace}
                    onChange={(e) => setPace(e.target.value as GoalPace)}
                    className="flex h-9 w-full rounded-lg border border-input bg-background px-2 text-xs"
                  >
                    <option value="mild">Mild (0.25kg/wk)</option>
                    <option value="moderate">Moderate (0.5kg/wk)</option>
                    <option value="aggressive">Aggressive (0.75kg/wk)</option>
                  </select>
                </div>
              </div>

              {/* Calculated Macro Preview */}
              {(() => {
                const computed = calculateDailyGoals({
                  weightKg,
                  targetKg,
                  heightCm,
                  age,
                  gender,
                  activityLevel,
                  pace,
                });
                return (
                  <div className="space-y-2 p-3 rounded-xl bg-primary/5 border border-primary/10 text-center">
                    <div className="flex items-center justify-between text-xs border-b border-primary/10 pb-1.5">
                      <span className="text-muted-foreground font-medium">BMR: {computed.bmr} kcal | TDEE: {computed.tdee} kcal</span>
                      <span className="font-bold text-primary">{computed.goalKcal} kcal/day</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground">Protein</div>
                        <div className="text-sm font-bold text-foreground">{computed.goalProtein}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground">Carbs</div>
                        <div className="text-sm font-bold text-foreground">{computed.goalCarbs}g</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase font-semibold text-muted-foreground">Fat</div>
                        <div className="text-sm font-bold text-foreground">{computed.goalFat}g</div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

          {/* STEP 3: Meal Schedule */}
          {step === 3 && (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="bf-time" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Breakfast Time
                </Label>
                <Input
                  id="bf-time"
                  type="time"
                  value={breakfastTime}
                  onChange={(e) => setBreakfastTime(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="lunch-time" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Lunch Time
                </Label>
                <Input
                  id="lunch-time"
                  type="time"
                  value={lunchTime}
                  onChange={(e) => setLunchTime(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dinner-time" className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-primary" /> Dinner Time
                </Label>
                <Input
                  id="dinner-time"
                  type="time"
                  value={dinnerTime}
                  onChange={(e) => setDinnerTime(e.target.value)}
                  className="h-10 rounded-lg"
                />
              </div>
            </div>
          )}

          {/* STEP 4: Theme Selection */}
          {step === 4 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "light", label: "Light", icon: Sun, desc: "Clean amber" },
                { id: "dark", label: "Dark", icon: Moon, desc: "Deep dark" },
                { id: "system", label: "System", icon: Monitor, desc: "Auto sync" },
              ].map((t) => {
                const Icon = t.icon;
                const isSelected = selectedTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setSelectedTheme(t.id as ThemeMode)}
                    className={`flex flex-col items-center justify-center p-3.5 rounded-xl border transition-all cursor-pointer text-center ${
                      isSelected
                        ? "border-primary bg-primary/10 text-primary shadow-sm"
                        : "border-border hover:bg-secondary/50 text-muted-foreground"
                    }`}
                  >
                    <Icon className="h-6 w-6 mb-2" />
                    <span className="text-xs font-bold">{t.label}</span>
                    <span className="text-[10px] text-muted-foreground mt-0.5">{t.desc}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <DialogFooter className="flex items-center justify-between gap-2 sm:justify-between pt-2">
          {step > 1 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="gap-1 text-xs cursor-pointer"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Button>
          ) : (
            <span />
          )}

          {step < 4 ? (
            <Button
              type="button"
              size="sm"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="gap-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer"
            >
              Next <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleFinish}
              className="gap-1 text-xs bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 text-white cursor-pointer shadow-xs"
            >
              Get Started <Sparkles className="h-3.5 w-3.5" />
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
