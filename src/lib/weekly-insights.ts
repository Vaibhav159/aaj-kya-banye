import { DISHES_BY_ID, type Dish } from "./dishes";
import { type DayPlan } from "./plan";
import { checkDay } from "./rules";
import { type CustomRule } from "./custom-rules";

export interface PreferenceHighlight {
  label: string;
  detail: string;
  badge?: string;
}

export interface RuleViolationItem {
  ruleName: string;
  count: number;
  description: string;
}

export interface WeeklyInsightSuggestion {
  text: string;
  actionType: "protein" | "soup" | "paratha" | "variety" | "rule";
}

export interface WeeklyInsightsData {
  uniqueVegCount: number;
  vegetableNames: string[];
  proteinGoalAchievedDays: number;
  totalDays: number;
  repeatedMealsCount: number;
  repeatedDishNames: string[];
  preferences: PreferenceHighlight[];
  ruleViolations: RuleViolationItem[];
  suggestions: WeeklyInsightSuggestion[];
}

const COMMON_VEG_KEYWORDS = [
  "spinach", "palak", "paneer", "tomato", "onion", "capsicum", "lauki", "bhindi",
  "methi", "gobi", "cauliflower", "peas", "matar", "aloo", "potato", "baingan",
  "eggplant", "brinjal", "karela", "bitter gourd", "turai", "ridge gourd",
  "tinda", "bottle gourd", "sarson", "cabbage", "patta gobi", "carrot", "gajar",
  "beetroot", "mooli", "radish", "pumpkin", "kaddu", "arbi", "french beans",
  "beans", "corn", "mushroom", "broccoflower", "broccoli", "zucchini", "cucumber"
];

/**
 * Generates dynamic Weekly AI Insights based on the current 7-day strip of the active meal plan cycle.
 * ponytail: Pure client-side heuristic calculation without external API dependencies. Fast, private, and deterministic.
 */
export function generateWeeklyInsights(
  plan: DayPlan[],
  dayIdx: number,
  customRules: CustomRule[] = [],
  goalProtein: number = 60
): WeeklyInsightsData {
  if (!plan || plan.length === 0) {
    return {
      uniqueVegCount: 0,
      vegetableNames: [],
      proteinGoalAchievedDays: 0,
      totalDays: 7,
      repeatedMealsCount: 0,
      repeatedDishNames: [],
      preferences: [],
      ruleViolations: [],
      suggestions: [],
    };
  }

  const cycleLen = plan.length;
  // Get 7-day strip starting at dayIdx
  const weekDays = Array.from({ length: 7 }, (_, i) => plan[(dayIdx + i) % cycleLen]);

  const vegSet = new Set<string>();
  const dishCounts = new Map<string, { count: number; name: string }>();

  let proteinGoalAchievedDays = 0;
  let paneerCount = 0;
  let airfryerCount = 0;
  let lightDinnerCount = 0;
  let heavyDinnerCount = 0;
  let soupCount = 0;
  let parathaCount = 0;
  let southIndianCount = 0;
  let highProteinMealCount = 0;

  weekDays.forEach((day, i) => {
    const actualDayIdx = (dayIdx + i) % cycleLen;
    const b = DISHES_BY_ID[day.breakfast];
    const l = DISHES_BY_ID[day.lunch];
    const din = DISHES_BY_ID[day.dinner];

    const dayDishes = [b, l, din].filter((d): d is Dish => Boolean(d));

    // Daily protein total
    const totalProtein = dayDishes.reduce((acc, d) => acc + (d.protein ?? 0), 0);
    if (totalProtein >= goalProtein) {
      proteinGoalAchievedDays++;
    }

    // Light vs Heavy Dinners
    const lKcal = l?.kcal ?? 0;
    const dinKcal = din?.kcal ?? 0;
    if (dinKcal < lKcal || dinKcal <= 420) {
      lightDinnerCount++;
    }
    if (dinKcal > lKcal) {
      heavyDinnerCount++;
    }

    // Process each dish
    dayDishes.forEach((dish) => {
      // Dish repetition
      const existing = dishCounts.get(dish.id);
      if (existing) {
        existing.count++;
      } else {
        dishCounts.set(dish.id, { count: 1, name: dish.name });
      }

      // Ingredients & Veggies
      if (dish.ingredients && Array.isArray(dish.ingredients)) {
        dish.ingredients.forEach((ing) => {
          if (ing.category === "veg" && ing.name) {
            vegSet.add(ing.name.toLowerCase().trim());
          }
        });
      }

      // Name keyword veg check fallback
      const lowerName = dish.name.toLowerCase();
      COMMON_VEG_KEYWORDS.forEach((veg) => {
        if (lowerName.includes(veg)) {
          vegSet.add(veg);
        }
      });

      // Tags & Equipment
      const tags = dish.tags ?? [];
      const equipment = dish.equipment ?? [];

      if (tags.includes("paneer") || lowerName.includes("paneer")) paneerCount++;
      if (equipment.includes("airfryer") || tags.includes("airfryer" as any)) airfryerCount++;
      if (tags.includes("soup") || lowerName.includes("soup")) soupCount++;
      if (tags.includes("paratha") || lowerName.includes("paratha")) parathaCount++;
      if (tags.includes("south-indian") || dish.cuisine === "south-indian") southIndianCount++;
      if (dish.protein >= 20) highProteinMealCount++;
    });
  });

  // Unique vegetables list
  const vegetableNames = Array.from(vegSet).map(
    (v) => v.charAt(0).toUpperCase() + v.slice(1)
  );

  // Repeated meals
  const repeatedDishNames: string[] = [];
  let repeatedMealsCount = 0;
  dishCounts.forEach(({ count, name }) => {
    if (count > 1) {
      repeatedMealsCount += count - 1;
      repeatedDishNames.push(name);
    }
  });

  // Preference Highlights (Pick top 3-4 distinct preferences)
  const preferences: PreferenceHighlight[] = [];
  if (paneerCount >= 2) {
    preferences.push({
      label: "Paneer meals",
      detail: `${paneerCount} dishes this week`,
    });
  }
  if (airfryerCount >= 2) {
    preferences.push({
      label: "Air fryer meals",
      detail: `${airfryerCount} quick & crisp meals`,
    });
  }
  if (lightDinnerCount >= 4) {
    preferences.push({
      label: "Light dinners",
      detail: `${lightDinnerCount}/7 days under lunch calories`,
    });
  }
  if (southIndianCount >= 2) {
    preferences.push({
      label: "South Indian breakfasts",
      detail: `${southIndianCount} fermented & steamed meals`,
    });
  }
  if (highProteinMealCount >= 4) {
    preferences.push({
      label: "High protein dishes",
      detail: `${highProteinMealCount} meals with 20g+ protein`,
    });
  }
  // Fallback defaults if fewer than 3 specific preferences triggered
  if (preferences.length < 3) {
    if (soupCount > 0) {
      preferences.push({
        label: "Soups & light bowls",
        detail: `${soupCount} comforting meals`,
      });
    }
    preferences.push({
      label: "Balanced home cooking",
      detail: "Variety of dals & rotis",
    });
  }

  // Rule Violations
  const ruleViolations: RuleViolationItem[] = [];
  if (heavyDinnerCount > 0) {
    ruleViolations.push({
      ruleName: "Dinner heavier than lunch",
      count: heavyDinnerCount,
      description: `Dinner exceeds lunch calories on ${heavyDinnerCount} day${heavyDinnerCount > 1 ? "s" : ""}`,
    });
  }

  // Evaluate Custom Rules across week
  if (customRules && customRules.length > 0) {
    const customViolationsMap = new Map<string, number>();
    weekDays.forEach((_, i) => {
      const actualIdx = (dayIdx + i) % cycleLen;
      const checks = checkDay(plan, actualIdx, customRules);
      checks.forEach((c) => {
        if (!c.passed) {
          const ruleObj = customRules.find((r) => r.id === c.ruleId);
          const title = ruleObj?.name || "Custom Rule";
          customViolationsMap.set(title, (customViolationsMap.get(title) ?? 0) + 1);
        }
      });
    });

    customViolationsMap.forEach((count, ruleName) => {
      ruleViolations.push({
        ruleName,
        count,
        description: `Violated ${count} time${count > 1 ? "s" : ""} this week`,
      });
    });
  }

  // Smart Suggestions
  const suggestions: WeeklyInsightSuggestion[] = [];

  if (soupCount < 2) {
    suggestions.push({
      text: "Add 1 more soup day for lighter evening digestion.",
      actionType: "soup",
    });
  }

  if (proteinGoalAchievedDays < 5) {
    suggestions.push({
      text: "Increase protein intake by adding paneer, soya, or sprouts to lunch.",
      actionType: "protein",
    });
  }

  if (parathaCount >= 2) {
    suggestions.push({
      text: "Replace one paratha meal with besan chilla or oats upma.",
      actionType: "paratha",
    });
  } else if (repeatedMealsCount > 0) {
    suggestions.push({
      text: `Swap repeated dish '${repeatedDishNames[0]}' to maximize rotation variety.`,
      actionType: "variety",
    });
  }

  if (vegetableNames.length < 6) {
    suggestions.push({
      text: "Include 2-3 more distinct vegetables like spinach or methi for better micronutrients.",
      actionType: "variety",
    });
  }

  // Ensure at least 3 actionable suggestions
  if (suggestions.length < 3) {
    suggestions.push({
      text: "Keep dinner portion lighter than lunch to improve overnight digestion.",
      actionType: "rule",
    });
  }

  return {
    uniqueVegCount: vegetableNames.length,
    vegetableNames: vegetableNames.slice(0, 10),
    proteinGoalAchievedDays,
    totalDays: 7,
    repeatedMealsCount,
    repeatedDishNames,
    preferences: preferences.slice(0, 3),
    ruleViolations,
    suggestions: suggestions.slice(0, 3),
  };
}
