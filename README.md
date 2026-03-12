# ⛽ FuelWatch PH

Real-time fuel price monitor for Filipino motorists. Find the cheapest stations, track price trends, report violations, and get AI-powered advice.

## Features

- 📍 **Station Finder** — Map view of nearby stations sorted by price or distance
- 📈 **Price Trends** — 9-week price history chart for gasoline & diesel
- 🧮 **Fuel Calculator** — Trip cost, fill-up cost & monthly budget by vehicle type
- 🤖 **AI Advisor** — Powered by Claude AI for real-time fuel advice
- 🔔 **Alerts** — Live price alerts & government subsidy tracker
- 🚨 **Violation Reporter** — Report price gouging directly to DOE
- 🔐 **User Login** — Sign up / sign in with account management

---

## 🚀 Deploy to Vercel (5 minutes)

### Step 1 — Install dependencies
```bash
npm install
```

### Step 2 — Add your API key
```bash
cp .env.example .env
```
Open `.env` and replace `your_anthropic_api_key_here` with your key from:
👉 https://console.anthropic.com/api-keys

### Step 3 — Test locally
```bash
npm run dev
```
Open http://localhost:5173 — everything should work including AI.

### Step 4 — Push to GitHub
```bash
git init
git add .
git commit -m "FuelWatch PH v2 🇵🇭"
```
Go to https://github.com/new, create a repo called `fuelwatch-ph`, then:
```bash
git remote add origin https://github.com/YOUR_USERNAME/fuelwatch-ph.git
git branch -M main
git push -u origin main
```

### Step 5 — Deploy on Vercel
1. Go to https://vercel.com and sign up (free) with your GitHub account
2. Click **"Add New Project"**
3. Select your `fuelwatch-ph` repository
4. Go to **Environment Variables** and add:
   - Name: `VITE_ANTHROPIC_API_KEY`
   - Value: your Anthropic API key
5. Click **Deploy**

✅ Done! Your app will be live at `https://fuelwatch-ph.vercel.app`

---

## 🔧 Tech Stack

- **React 18** + **Vite** — Frontend framework
- **Claude AI** (claude-sonnet) — AI Advisor
- **CSS Variables** — Theming & design system
- **Barlow Condensed** — Typography

---

## 🗺️ Roadmap

- [ ] Firebase Auth — persistent user accounts
- [ ] Firestore DB — real crowdsourced price submissions
- [ ] Google Maps API — live station locations & routing
- [ ] DOE API integration — official price feed
- [ ] Push notifications — price alert subscriptions
- [ ] PWA — installable mobile app

---

## 📞 Data Sources

- Department of Energy Philippines (DOE)
- Crowdsourced user reports
- INQUIRER.net Oil Price Watch

---

Built to help Filipinos cope with the 2026 fuel price crisis. Not affiliated with the Philippine government.
