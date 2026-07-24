import { describe, it, expect } from "vitest";
import { calculateDailyGoals } from "../store";

describe("calculateDailyGoals", () => {
  it("calculates accurate BMR, TDEE, calories, and macros for weight loss", () => {
    const goals = calculateDailyGoals({
      weightKg: 80,
      targetKg: 75,
      heightCm: 175,
      age: 30,
      gender: "male",
      activityLevel: "moderate",
      pace: "moderate",
    });

    // BMR = 10*80 + 6.25*175 - 5*30 + 5 = 800 + 1093.75 - 150 + 5 = 1748.75 ~ 1749
    expect(goals.bmr).toBe(1749);
    // TDEE = 1748.75 * 1.55 = 2710.56 ~ 2711
    expect(goals.tdee).toBe(2711);
    // Loss deficit (-550) = 2711 - 550 = 2161
    expect(goals.goalKcal).toBe(2161);
    // Protein = 75 * 1.8 = 135g
    expect(goals.goalProtein).toBe(135);
    // Fat = 25% of 2161 / 9 = 60g
    expect(goals.goalFat).toBe(60);
    // Carbs = (2161 - (135*4 + 60*9)) / 4 = (2161 - (540 + 540)) / 4 = 1081 / 4 = 270g
    expect(goals.goalCarbs).toBe(270);
  });

  it("enforces calorie safety floor for females", () => {
    const goals = calculateDailyGoals({
      weightKg: 45,
      targetKg: 40,
      heightCm: 150,
      age: 40,
      gender: "female",
      activityLevel: "sedentary",
      pace: "aggressive",
    });

    expect(goals.goalKcal).toBeGreaterThanOrEqual(1200);
  });
});
