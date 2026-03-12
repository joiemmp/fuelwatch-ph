# 🔥 Firebase Setup Guide (10 minutes)

## Step 1 — Create Firebase Project
1. Go to **console.firebase.google.com**
2. Click **"Add project"**
3. Name it `fuelwatch-ph`
4. Disable Google Analytics (optional)
5. Click **"Create project"**

## Step 2 — Add a Web App
1. On your project dashboard, click the **</>** (Web) icon
2. App nickname: `fuelwatch-ph`
3. Click **"Register app"**
4. You'll see a config object like this — COPY IT:
```js
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "fuelwatch-ph.firebaseapp.com",
  projectId: "fuelwatch-ph",
  storageBucket: "fuelwatch-ph.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123:web:abc123"
};
```

## Step 3 — Enable Email/Password Auth
1. Left menu → **Authentication** → **Get started**
2. Click **"Email/Password"**
3. Toggle **Enable** → **Save**

## Step 4 — Create Firestore Database
1. Left menu → **Firestore Database** → **Create database**
2. Select **"Start in test mode"** (allows all reads/writes for 30 days)
3. Choose region: **asia-southeast1 (Singapore)** → **Done**

## Step 5 — Add Firebase keys to your .env file
Open your `.env` file and fill in from the config you copied:
```
VITE_ANTHROPIC_API_KEY=sk-ant-your-key
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=fuelwatch-ph.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=fuelwatch-ph
VITE_FIREBASE_STORAGE_BUCKET=fuelwatch-ph.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123:web:abc123
```

## Step 6 — Add keys to Vercel
1. Go to vercel.com → your project → **Settings** → **Environment Variables**
2. Add each key from your .env file
3. Click **Redeploy**

## Step 7 — Push updated code to GitHub
```bash
cd ~/Downloads/fuelwatch-ph
git add .
git commit -m "Add Firebase auth and Firestore"
git push https://joiemmp:YOUR_TOKEN@github.com/joiemmp/fuelwatch-ph.git main
```

✅ Done! Users can now sign up, sign in, and reports are saved permanently in Firebase.
