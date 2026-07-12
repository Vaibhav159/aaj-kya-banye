# Aaj Kya Banaye? 🍛

A premium, single-file, dark-theme meal planning dashboard designed to help you stay on track with your health journey and calorie goals. It dynamically reads your 42-day rotating meal plan from a Google Sheet, calculates daily calories/macros, aggregates grocery lists by customizable date ranges, and lets you swap meals on the fly with smart calorie-matched suggestions.

---

## 🚀 Live Demo & Deployment

This project is built to be hosted on **GitHub Pages** with zero build configuration.

### How to put this on GitHub Pages:

1. **Initialize Git locally** (run these in your terminal in the project folder):
   ```bash
   git init
   git add .
   git commit -m "Initial commit of Aaj Kya Banaye planner"
   ```

2. **Create a new repository on GitHub**:
   - Go to [github.com/new](https://github.com/new)
   - Name it `aaj-kya-banaye` (or any name you prefer)
   - Keep it **Public** (required for free GitHub Pages hosting)
   - Do **NOT** initialize it with a README, `.gitignore`, or license.

3. **Link and push to GitHub**:
   ```bash
   # Replace with your actual GitHub username and repository name
   git remote add origin https://github.com/YOUR_USERNAME/aaj-kya-banaye.git
   git branch -M main
   git push -u origin main
   ```

4. **Enable GitHub Pages**:
   - Go to your repository on GitHub.
   - Click on **Settings** (gear icon) -> **Pages** (in the sidebar under "Code and automation").
   - Under **Build and deployment**, set the Source to **Deploy from a branch**.
   - Under **Branch**, select `main` and `/ (root)`, then click **Save**.
   - After 1-2 minutes, your app will be live at `https://YOUR_USERNAME.github.io/aaj-kya-banaye/`!

---

## ✨ Features

- **🌅 Today's Meal Cards**: Highlights your Breakfast, Lunch, and Dinner for today.
- **🔄 Meal Swap / Suggestions**: Tap **"Suggest"** on any meal to see up to 4 alternatives from the dish pool that match the meal slot (e.g. breakfast vs. dinner), fall within $\pm 150 \text{ kcal}$, haven't been eaten in the last/next 3 days, and follow all dietary rules.
- **📊 Daily Nutrition Ring**: Real-time tracker for calories and macros (Protein, Carbs, Fat) matching your customized daily goals.
- **📅 Weekly Planner**: View a rolling 7-day schedule with estimated daily calorie targets.
- **🛒 Smart Grocery List**:
  - Filter by **Today | 2 Days | 3 Days | This Week | Next Week**.
  - Aggregates ingredients, combines quantities (e.g., sums grams/milliliters), categorizes items with emojis, and includes a **Copy List** button.
- **🗄️ Searchable Food Database**: Shows all 69 Indian vegetarian dishes with their calorie details and macro ratios. Filter by slots (Breakfast, Lunch, Dinner) or search dynamically.
- **📋 Full 42-Day Plan Table**: Displays the entire 42-day cycle in a single table with your current cycle day highlighted.
- **⚙️ Profile Settings**: Set your name, weight, target, and calorie goals. Saves immediately to `localStorage`.
- **📏 Rule Tracker**: Lists the 8 dietary guidelines (pizza limits, paratha slots, breakfast exclusions) to keep your health journey on track.

---

## 🛠️ Tech Stack & Design

- **Vanilla HTML5, CSS3, & JavaScript**: Everything resides in a single, highly-optimized [`index.html`](file:///Users/vaibhav/Personal%20Projects/aaj%20kya%20banye/index.html) file. No build tools, NPM packages, or frameworks needed.
- **Glassmorphism UI**: Beautiful dark interface (`#0a0a12` base) with blurred transparent cards, gradient accents, fine grain overlay, and modern typography (Inter).
- **Google Sheets Database**: Dynamically fetches your menu from Sheet 1 of [this Google Sheet](https://docs.google.com/spreadsheets/d/1zVWajno7F7b947-6vz8-uSgSGUkJoP4vNAKAtfbds6E/edit?usp=sharing).
- **Offline / Fetch Fallback**: If the Google Sheets API is blocked, rate-limited, or offline, the app seamlessly falls back to the embedded 42-day cycle data.

---

## 📝 Customizing Your Dishes & Meals

To change calorie values, protein counts, or ingredients for dishes:
1. Open [`index.html`](file:///Users/vaibhav/Personal%20Projects/aaj%20kya%20banye/index.html).
2. Locate `const DISH_DB` in the `<script>` section.
3. Update the values for the respective dish. For example:
   ```javascript
   "Overnight Oats": {
     cal: 350,
     p: 14,
     c: 48,
     f: 12,
     slots: ["b"],
     ing: [["Rolled oats", "50g", "grains"], ["Milk", "200ml", "dairy"]]
   }
   ```
4. Save the file and refresh or redeploy!
