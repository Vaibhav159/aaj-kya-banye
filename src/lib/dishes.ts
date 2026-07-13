export type Slot = "breakfast" | "lunch" | "dinner";
export type IngredientCategory =
  | "veg"
  | "grain"
  | "dairy"
  | "legume"
  | "spice"
  | "oil"
  | "fruit"
  | "nut"
  | "other";

export interface Ingredient {
  name: string;
  qty: number;
  unit: "g" | "ml" | "pc";
  category: IngredientCategory;
}

export type Cuisine =
  | "north-indian"
  | "south-indian"
  | "gujarati"
  | "punjabi"
  | "bengali"
  | "maharashtrian"
  | "indo-chinese"
  | "continental";

export type CookingType =
  | "stovetop"
  | "no-cook"
  | "steamed"
  | "baked"
  | "fried"
  | "grilled"
  | "instant-pot";

export type Equipment =
  | "stove"
  | "oven"
  | "airfryer"
  | "microwave"
  | "blender"
  | "pressure-cooker"
  | "griddle";

export interface Dish {
  id: string;
  name: string;
  emoji: string;
  slots: Slot[];
  kcal: number;
  protein: number; // g
  carbs: number; // g
  fat: number; // g
  tags: DishTag[];
  ingredients: Ingredient[];
  cuisine?: Cuisine;
  cookingType?: CookingType;
  equipment?: Equipment[];
  prepMinutes?: number;
  spiceLevel?: 0 | 1 | 2 | 3;
  recipeUrl?: string;
}

export type DishTag =
  | "pizza"
  | "paratha"
  | "fried-breakfast"
  | "dal"
  | "legume"
  | "leafy"
  | "sweet"
  | "light";

export const CATEGORY_EMOJI: Record<IngredientCategory, string> = {
  veg: "🥬",
  grain: "🌾",
  dairy: "🥛",
  legume: "🫘",
  spice: "🧂",
  oil: "🫒",
  fruit: "🍎",
  nut: "🥜",
  other: "🧺",
};

// Compact ingredient helpers
const g = (name: string, qty: number, category: IngredientCategory): Ingredient => ({ name, qty, unit: "g", category });
const ml = (name: string, qty: number, category: IngredientCategory): Ingredient => ({ name, qty, unit: "ml", category });
const pc = (name: string, qty: number, category: IngredientCategory): Ingredient => ({ name, qty, unit: "pc", category });

export function youtubeSearchUrl(name: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(name + " recipe")}`;
}

// Manual overrides for dishes that need specific metadata; others get sensible defaults.
const META_OVERRIDES: Record<string, Partial<Pick<Dish, "cuisine" | "cookingType" | "equipment" | "prepMinutes" | "spiceLevel">>> = {
  b3: { cuisine: "south-indian", cookingType: "steamed", equipment: ["stove", "pressure-cooker"], prepMinutes: 30 },
  b4: { cuisine: "south-indian", cookingType: "stovetop", equipment: ["griddle"], prepMinutes: 25 },
  b5: { cuisine: "south-indian", cookingType: "stovetop", equipment: ["griddle"], prepMinutes: 20 },
  b8: { cuisine: "gujarati", cookingType: "stovetop", equipment: ["griddle"], prepMinutes: 25, spiceLevel: 1 },
  b14: { cuisine: "south-indian", cookingType: "fried", equipment: ["stove"], prepMinutes: 45, spiceLevel: 2 },
  b15: { cuisine: "south-indian", cookingType: "stovetop", equipment: ["blender", "griddle"], prepMinutes: 25 },
  b16: { cuisine: "south-indian", cookingType: "steamed", equipment: ["stove"], prepMinutes: 30 },
  b17: { cuisine: "north-indian", cookingType: "fried", equipment: ["stove"], prepMinutes: 30, spiceLevel: 2 },
  b19: { cuisine: "continental", cookingType: "no-cook", equipment: [], prepMinutes: 5 },
  b22: { cuisine: "north-indian", cookingType: "fried", equipment: ["stove"], prepMinutes: 40, spiceLevel: 2 },
  b23: { cuisine: "punjabi", cookingType: "fried", equipment: ["stove"], prepMinutes: 60, spiceLevel: 2 },
  l2: { cuisine: "punjabi", cookingType: "instant-pot", equipment: ["pressure-cooker"], prepMinutes: 45, spiceLevel: 2 },
  l3: { cuisine: "punjabi", cookingType: "instant-pot", equipment: ["pressure-cooker"], prepMinutes: 40, spiceLevel: 2 },
  l4: { cuisine: "punjabi", cookingType: "stovetop", equipment: ["stove", "blender"], prepMinutes: 30, spiceLevel: 2 },
  l5: { cuisine: "punjabi", cookingType: "stovetop", equipment: ["stove", "blender"], prepMinutes: 30, spiceLevel: 1 },
  l9: { cuisine: "north-indian", cookingType: "stovetop", equipment: ["pressure-cooker"], prepMinutes: 60, spiceLevel: 2 },
  l16: { cuisine: "south-indian", cookingType: "stovetop", equipment: ["pressure-cooker"], prepMinutes: 35 },
  l17: { cuisine: "south-indian", cookingType: "no-cook", equipment: [], prepMinutes: 10 },
  l18: { cuisine: "maharashtrian", cookingType: "stovetop", equipment: ["griddle"], prepMinutes: 30, spiceLevel: 2 },
  l24: { cuisine: "punjabi", cookingType: "stovetop", equipment: ["stove", "blender"], prepMinutes: 60, spiceLevel: 1 },
  l25: { cuisine: "punjabi", cookingType: "instant-pot", equipment: ["pressure-cooker"], prepMinutes: 90, spiceLevel: 1 },
  d1: { cuisine: "north-indian", cookingType: "instant-pot", equipment: ["pressure-cooker"], prepMinutes: 20 },
  d3: { cuisine: "indo-chinese", cookingType: "stovetop", equipment: ["stove"], prepMinutes: 20, spiceLevel: 1 },
  d4: { cuisine: "continental", cookingType: "stovetop", equipment: ["stove"], prepMinutes: 20, spiceLevel: 0 },
  d5: { cuisine: "north-indian", cookingType: "instant-pot", equipment: ["pressure-cooker"], prepMinutes: 25 },
  d6: { cuisine: "continental", cookingType: "stovetop", equipment: ["griddle"], prepMinutes: 15, spiceLevel: 1 },
  d7: { cuisine: "continental", cookingType: "baked", equipment: ["oven", "airfryer"], prepMinutes: 25, spiceLevel: 1 },
  d8: { cuisine: "continental", cookingType: "stovetop", equipment: ["stove"], prepMinutes: 20, spiceLevel: 1 },
  d9: { cuisine: "indo-chinese", cookingType: "fried", equipment: ["stove"], prepMinutes: 40, spiceLevel: 2 },
  d10: { cuisine: "punjabi", cookingType: "stovetop", equipment: ["stove"], prepMinutes: 20, spiceLevel: 2 },
};

function enrich(
  id: string,
  name: string,
  tags: DishTag[],
): Pick<Dish, "cuisine" | "cookingType" | "equipment" | "prepMinutes" | "spiceLevel" | "recipeUrl"> {
  const base: Pick<Dish, "cuisine" | "cookingType" | "equipment" | "prepMinutes" | "spiceLevel"> = {
    cuisine: "north-indian",
    cookingType: tags.includes("fried-breakfast") ? "fried" : "stovetop",
    equipment: ["stove"],
    prepMinutes: 25,
    spiceLevel: 1,
  };
  return { ...base, ...META_OVERRIDES[id], recipeUrl: youtubeSearchUrl(name) };
}

type Raw = [string, string, string, Slot[], number, number, number, number, DishTag[], Ingredient[]];

const raws: Raw[] = [
  // ---- Breakfast (b*) ----
  ["b1", "Poha", "🥣", ["breakfast"], 320, 8, 55, 8, [], [g("flattened rice", 80, "grain"), g("onion", 50, "veg"), g("peanuts", 15, "nut"), g("peas", 20, "veg"), ml("oil", 10, "oil")]],
  ["b2", "Upma", "🥣", ["breakfast"], 350, 9, 58, 9, [], [g("semolina", 80, "grain"), g("onion", 40, "veg"), g("carrot", 30, "veg"), ml("oil", 10, "oil")]],
  ["b3", "Idli Sambar", "⚪", ["breakfast"], 380, 12, 70, 5, ["dal", "legume"], [g("idli batter", 200, "grain"), g("toor dal", 40, "legume"), g("mixed veg", 60, "veg")]],
  ["b4", "Masala Dosa", "🥞", ["breakfast"], 450, 10, 68, 15, [], [g("dosa batter", 150, "grain"), g("potato", 100, "veg"), g("onion", 40, "veg"), ml("oil", 12, "oil")]],
  ["b5", "Uttapam", "🥞", ["breakfast"], 400, 11, 62, 12, [], [g("dosa batter", 150, "grain"), g("onion", 50, "veg"), g("tomato", 40, "veg"), g("capsicum", 30, "veg")]],
  ["b6", "Aloo Paratha", "🫓", ["breakfast", "lunch"], 480, 11, 60, 20, ["paratha"], [g("wheat flour", 80, "grain"), g("potato", 120, "veg"), g("ghee", 15, "dairy")]],
  ["b7", "Gobi Paratha", "🫓", ["breakfast", "lunch"], 460, 12, 58, 19, ["paratha"], [g("wheat flour", 80, "grain"), g("cauliflower", 120, "veg"), g("ghee", 15, "dairy")]],
  ["b8", "Methi Thepla", "🫓", ["breakfast", "lunch"], 380, 10, 52, 14, ["paratha", "leafy"], [g("wheat flour", 70, "grain"), g("fenugreek leaves", 60, "veg"), ml("oil", 10, "oil")]],
  ["b9", "Besan Chilla", "🥞", ["breakfast"], 320, 15, 32, 12, ["legume"], [g("gram flour", 70, "legume"), g("onion", 40, "veg"), g("tomato", 40, "veg")]],
  ["b10", "Sabudana Khichdi", "🍚", ["breakfast"], 400, 6, 65, 13, [], [g("sabudana", 80, "grain"), g("potato", 80, "veg"), g("peanuts", 20, "nut")]],
  ["b11", "Vegetable Dalia", "🥣", ["breakfast"], 300, 9, 50, 6, [], [g("dalia", 60, "grain"), g("mixed veg", 100, "veg"), ml("oil", 5, "oil")]],
  ["b12", "Masala Oats", "🥣", ["breakfast"], 290, 10, 45, 7, [], [g("oats", 50, "grain"), g("mixed veg", 80, "veg"), ml("milk", 100, "dairy")]],
  ["b13", "Suji Sheera", "🍮", ["breakfast"], 420, 6, 60, 18, ["sweet"], [g("semolina", 60, "grain"), g("ghee", 20, "dairy"), g("sugar", 30, "other"), g("cashew", 10, "nut")]],
  ["b14", "Medu Vada", "🍩", ["breakfast"], 480, 12, 45, 25, ["fried-breakfast", "legume"], [g("urad dal", 80, "legume"), ml("oil", 25, "oil"), g("onion", 30, "veg")]],
  ["b15", "Pesarattu", "🥞", ["breakfast", "dinner"], 360, 15, 50, 10, ["legume"], [g("moong dal", 80, "legume"), g("ginger", 5, "spice"), ml("oil", 8, "oil")]],
  ["b16", "Appam with Stew", "🥥", ["breakfast"], 430, 10, 60, 16, [], [g("rice batter", 120, "grain"), ml("coconut milk", 150, "dairy"), g("mixed veg", 80, "veg")]],
  ["b17", "Aloo Tikki Chaat", "🥔", ["breakfast"], 470, 10, 55, 22, ["fried-breakfast"], [g("potato", 150, "veg"), g("chickpeas", 50, "legume"), ml("oil", 15, "oil"), g("yogurt", 60, "dairy")]],
  ["b18", "Veg Sandwich", "🥪", ["breakfast"], 340, 12, 45, 12, [], [g("bread", 80, "grain"), g("cucumber", 40, "veg"), g("tomato", 40, "veg"), g("cheese", 20, "dairy")]],
  ["b19", "Muesli Fruit Bowl", "🥣", ["breakfast"], 360, 12, 55, 10, [], [g("muesli", 60, "grain"), ml("milk", 200, "dairy"), g("banana", 100, "fruit"), g("almonds", 10, "nut")]],
  ["b20", "Veg Semiya", "🍜", ["breakfast"], 330, 8, 55, 8, [], [g("semiya", 70, "grain"), g("mixed veg", 80, "veg"), ml("oil", 8, "oil")]],
  ["b21", "Missi Roti", "🫓", ["breakfast", "lunch"], 380, 13, 55, 12, ["legume"], [g("wheat flour", 50, "grain"), g("gram flour", 40, "legume"), g("onion", 30, "veg"), ml("oil", 8, "oil")]],
  ["b22", "Puri Bhaji", "🫓", ["breakfast"], 550, 10, 65, 26, ["fried-breakfast"], [g("wheat flour", 80, "grain"), g("potato", 120, "veg"), ml("oil", 30, "oil")]],
  ["b23", "Bhatura Chole", "🫓", ["breakfast"], 620, 16, 78, 26, ["fried-breakfast", "legume"], [g("maida", 90, "grain"), g("chickpeas", 80, "legume"), ml("oil", 30, "oil")]],

  // ---- Lunch (l*) ----
  ["l1", "Dal Tadka & Rice", "🍛", ["lunch", "dinner"], 550, 20, 85, 12, ["dal", "legume"], [g("toor dal", 80, "legume"), g("rice", 100, "grain"), ml("ghee", 10, "dairy")]],
  ["l2", "Rajma Chawal", "🍛", ["lunch"], 620, 22, 95, 14, ["legume"], [g("kidney beans", 90, "legume"), g("rice", 100, "grain"), g("onion", 60, "veg"), g("tomato", 60, "veg")]],
  ["l3", "Chole Chawal", "🍛", ["lunch"], 610, 21, 92, 14, ["legume"], [g("chickpeas", 90, "legume"), g("rice", 100, "grain"), g("onion", 60, "veg")]],
  ["l4", "Paneer Butter Masala + Roti", "🧀", ["lunch"], 680, 26, 60, 34, [], [g("paneer", 120, "dairy"), g("wheat flour", 60, "grain"), g("tomato", 100, "veg"), ml("cream", 30, "dairy")]],
  ["l5", "Palak Paneer + Roti", "🥬", ["lunch", "dinner"], 620, 28, 55, 28, ["leafy"], [g("paneer", 120, "dairy"), g("spinach", 150, "veg"), g("wheat flour", 60, "grain")]],
  ["l6", "Aloo Gobi + Roti", "🥔", ["lunch", "dinner"], 520, 14, 70, 18, [], [g("potato", 120, "veg"), g("cauliflower", 120, "veg"), g("wheat flour", 60, "grain")]],
  ["l7", "Bhindi Masala + Roti", "🌿", ["lunch", "dinner"], 500, 12, 65, 18, [], [g("okra", 150, "veg"), g("onion", 50, "veg"), g("wheat flour", 60, "grain"), ml("oil", 12, "oil")]],
  ["l8", "Baingan Bharta + Roti", "🍆", ["lunch", "dinner"], 510, 13, 62, 20, [], [g("eggplant", 200, "veg"), g("onion", 60, "veg"), g("wheat flour", 60, "grain")]],
  ["l9", "Veg Biryani", "🍚", ["lunch"], 640, 15, 100, 18, [], [g("basmati rice", 120, "grain"), g("mixed veg", 150, "veg"), g("yogurt", 60, "dairy"), g("cashew", 10, "nut")]],
  ["l10", "Veg Pulao + Raita", "🍚", ["lunch", "dinner"], 560, 13, 85, 16, [], [g("basmati rice", 100, "grain"), g("mixed veg", 120, "veg"), g("yogurt", 100, "dairy")]],
  ["l11", "Kadhi Chawal", "🍛", ["lunch"], 540, 16, 78, 16, [], [g("gram flour", 40, "legume"), g("yogurt", 150, "dairy"), g("rice", 100, "grain")]],
  ["l12", "Chana Masala + Roti", "🌰", ["lunch", "dinner"], 580, 20, 78, 18, ["legume"], [g("chickpeas", 90, "legume"), g("wheat flour", 60, "grain"), g("tomato", 80, "veg")]],
  ["l13", "Masoor Dal + Rice", "🍲", ["lunch", "dinner"], 520, 22, 82, 8, ["dal", "legume"], [g("masoor dal", 80, "legume"), g("rice", 100, "grain")]],
  ["l14", "Chana Dal + Rice", "🍲", ["lunch", "dinner"], 540, 22, 84, 9, ["dal", "legume"], [g("chana dal", 80, "legume"), g("rice", 100, "grain")]],
  ["l15", "Moong Dal + Rice", "🍲", ["lunch", "dinner"], 500, 21, 80, 7, ["dal", "legume"], [g("moong dal", 80, "legume"), g("rice", 100, "grain")]],
  ["l16", "Sambar Rice", "🍛", ["lunch", "dinner"], 520, 18, 82, 10, ["dal", "legume"], [g("toor dal", 60, "legume"), g("rice", 100, "grain"), g("mixed veg", 100, "veg")]],
  ["l17", "Curd Rice", "🥣", ["lunch", "dinner"], 420, 12, 70, 10, [], [g("rice", 100, "grain"), g("yogurt", 200, "dairy")]],
  ["l18", "Pav Bhaji", "🍞", ["lunch"], 600, 14, 80, 22, [], [g("pav", 100, "grain"), g("mixed veg", 200, "veg"), g("butter", 20, "dairy")]],
  ["l19", "Matar Paneer + Roti", "🟢", ["lunch"], 610, 24, 60, 28, [], [g("paneer", 100, "dairy"), g("peas", 100, "veg"), g("wheat flour", 60, "grain")]],
  ["l20", "Kadai Paneer + Roti", "🌶️", ["lunch"], 640, 26, 58, 32, [], [g("paneer", 120, "dairy"), g("capsicum", 80, "veg"), g("wheat flour", 60, "grain")]],
  ["l21", "Malai Kofta + Rice", "🥟", ["lunch"], 700, 18, 80, 32, [], [g("paneer", 80, "dairy"), g("potato", 60, "veg"), g("rice", 100, "grain"), ml("cream", 40, "dairy")]],
  ["l22", "Veg Kolhapuri + Roti", "🌶️", ["lunch"], 570, 14, 68, 22, [], [g("mixed veg", 180, "veg"), g("coconut", 20, "nut"), g("wheat flour", 60, "grain")]],
  ["l23", "Aloo Baingan + Roti", "🍆", ["lunch", "dinner"], 500, 12, 65, 18, [], [g("potato", 100, "veg"), g("eggplant", 120, "veg"), g("wheat flour", 60, "grain")]],
  ["l24", "Sarson Ka Saag + Makki Roti", "🥬", ["lunch"], 580, 16, 68, 22, ["leafy"], [g("mustard greens", 200, "veg"), g("cornmeal", 70, "grain"), g("ghee", 15, "dairy")]],
  ["l25", "Dal Makhani + Rice", "🍛", ["lunch"], 660, 22, 82, 22, ["dal", "legume"], [g("black lentils", 80, "legume"), g("kidney beans", 20, "legume"), ml("cream", 30, "dairy"), g("rice", 100, "grain")]],
  ["l26", "Veg Kofta Curry + Roti", "🥟", ["lunch"], 620, 16, 70, 26, [], [g("mixed veg", 150, "veg"), g("gram flour", 30, "legume"), g("wheat flour", 60, "grain")]],
  ["l27", "Lauki Chana Dal + Rice", "🥒", ["lunch", "dinner"], 500, 19, 78, 10, ["dal", "legume"], [g("bottle gourd", 150, "veg"), g("chana dal", 60, "legume"), g("rice", 100, "grain")]],
  ["l28", "Methi Malai Matar + Roti", "🥬", ["lunch"], 590, 16, 60, 28, ["leafy"], [g("fenugreek leaves", 80, "veg"), g("peas", 80, "veg"), ml("cream", 30, "dairy"), g("wheat flour", 60, "grain")]],
  ["l29", "Mixed Veg Curry + Roti", "🥕", ["lunch", "dinner"], 520, 14, 66, 20, [], [g("mixed veg", 200, "veg"), g("wheat flour", 60, "grain"), ml("oil", 12, "oil")]],
  ["l30", "Rasam Rice", "🥣", ["lunch", "dinner"], 420, 12, 72, 8, ["dal", "legume"], [g("toor dal", 40, "legume"), g("tomato", 100, "veg"), g("rice", 100, "grain")]],

  // ---- Dinner (d*) ----
  ["d1", "Khichdi", "🍲", ["dinner"], 450, 16, 72, 9, ["dal", "legume", "light"], [g("rice", 70, "grain"), g("moong dal", 60, "legume"), g("ghee", 10, "dairy")]],
  ["d2", "Roti + Bhindi", "🌿", ["dinner"], 430, 11, 58, 15, ["light"], [g("wheat flour", 60, "grain"), g("okra", 120, "veg"), ml("oil", 10, "oil")]],
  ["d3", "Tofu Stir Fry + Roti", "🥢", ["dinner"], 460, 22, 50, 18, ["legume", "light"], [g("tofu", 120, "legume"), g("mixed veg", 120, "veg"), g("wheat flour", 60, "grain")]],
  ["d4", "Veg Soup + Toast", "🍜", ["dinner"], 380, 12, 55, 12, ["light"], [g("mixed veg", 200, "veg"), g("bread", 60, "grain"), g("butter", 10, "dairy")]],
  ["d5", "Palak Khichdi", "🥬", ["dinner"], 440, 16, 65, 10, ["dal", "legume", "leafy", "light"], [g("rice", 60, "grain"), g("moong dal", 50, "legume"), g("spinach", 120, "veg")]],
  ["d6", "Veg Wrap", "🌯", ["dinner"], 480, 15, 60, 18, [], [g("wheat tortilla", 90, "grain"), g("paneer", 60, "dairy"), g("veggies", 100, "veg")]],
  ["d7", "Veg Pizza", "🍕", ["dinner"], 720, 22, 85, 28, ["pizza"], [g("pizza base", 150, "grain"), g("cheese", 60, "dairy"), g("mixed veg", 100, "veg"), g("tomato sauce", 40, "veg")]],
  ["d8", "Veg Pasta", "🍝", ["dinner"], 560, 16, 78, 18, [], [g("pasta", 100, "grain"), g("mixed veg", 120, "veg"), g("cheese", 20, "dairy"), ml("olive oil", 12, "oil")]],
  ["d9", "Vegetable Manchurian + Fried Rice", "🥡", ["dinner"], 620, 14, 82, 24, [], [g("mixed veg", 150, "veg"), g("rice", 100, "grain"), ml("oil", 20, "oil")]],
  ["d10", "Paneer Bhurji + Roti", "🧀", ["dinner"], 520, 24, 45, 26, ["light"], [g("paneer", 120, "dairy"), g("onion", 60, "veg"), g("tomato", 60, "veg"), g("wheat flour", 45, "grain")]],
  ["d11", "Vegetable Handi + Roti", "🥘", ["dinner"], 500, 14, 60, 22, ["light"], [g("mixed veg", 180, "veg"), g("yogurt", 60, "dairy"), g("wheat flour", 60, "grain")]],
  ["d12", "Palak Roti + Curd", "🥬", ["dinner"], 420, 14, 55, 14, ["leafy", "light"], [g("wheat flour", 60, "grain"), g("spinach", 80, "veg"), g("yogurt", 100, "dairy")]],
  ["d13", "Cabbage Sabzi + Roti", "🥬", ["dinner"], 400, 11, 55, 13, ["leafy", "light"], [g("cabbage", 150, "veg"), g("wheat flour", 60, "grain"), ml("oil", 10, "oil")]],
  ["d14", "Turai Sabzi + Roti", "🥒", ["dinner"], 400, 11, 55, 13, ["light"], [g("ridge gourd", 150, "veg"), g("wheat flour", 60, "grain")]],
  ["d15", "Karela Sabzi + Roti", "🥒", ["dinner"], 410, 11, 56, 14, ["light"], [g("bitter gourd", 120, "veg"), g("onion", 40, "veg"), g("wheat flour", 60, "grain")]],
  ["d16", "Tinda Sabzi + Roti", "🥒", ["dinner"], 400, 11, 55, 13, ["light"], [g("apple gourd", 150, "veg"), g("wheat flour", 60, "grain")]],
  ["d17", "Gobi Matar + Roti", "🥦", ["dinner"], 440, 13, 60, 15, ["light"], [g("cauliflower", 120, "veg"), g("peas", 80, "veg"), g("wheat flour", 60, "grain")]],
];

export const DISHES: Dish[] = raws.map((r) => ({
  id: r[0],
  name: r[1],
  emoji: r[2],
  slots: r[3],
  kcal: r[4],
  protein: r[5],
  carbs: r[6],
  fat: r[7],
  tags: r[8],
  ingredients: r[9],
  ...enrich(r[0], r[1], r[8]),
}));

export const DISHES_BY_ID: Record<string, Dish> = Object.fromEntries(DISHES.map((d) => [d.id, d]));

export function dishesForSlot(slot: Slot): Dish[] {
  return DISHES.filter((d) => d.slots.includes(slot));
}


