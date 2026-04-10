# T Apps – Setup Guide

---

## 📦 Capacitor APK Build Guide

Build a native Android APK from this React/Vite project using Capacitor.

### Prerequisites
- Node.js 18+
- Android Studio installed (with SDK + Build Tools)
- Java JDK 17+

### Step 1 — Install Capacitor

```bash
npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/status-bar @capacitor/splash-screen @capacitor/keyboard
```

> **Note:** `capacitor.config.ts` is already configured in this project.

### Step 2 — Build the web app

```bash
npm run build
```

### Step 3 — Initialize Capacitor (first time only)

```bash
npx cap init "T Apps" "com.tapps.store" --web-dir dist
```

### Step 4 — Add Android platform

```bash
npx cap add android
```

### Step 5 — Sync web assets to Android

```bash
npx cap sync android
```

### Step 6 — Open in Android Studio

```bash
npx cap open android
```

In Android Studio:
- Wait for Gradle sync to finish
- Go to **Build → Generate Signed Bundle / APK**
- Select **APK**
- Create or use existing keystore
- Build **Release** variant

### Step 7 — Quick rebuild (after code changes)

```bash
npm run build && npx cap sync android
```

### APK Location
After build: `android/app/build/outputs/apk/release/app-release.apk`

---

## ▲ Vercel Deployment

This project includes a pre-configured `vercel.json` for instant Vercel deployment.

### Deploy via Vercel CLI

```bash
npm i -g vercel
vercel
```

Follow prompts: select your project, use default settings.

### Deploy via GitHub

1. Push project to a GitHub repository
2. Go to [vercel.com](https://vercel.com) → Import Project
3. Select your GitHub repo
4. Vercel auto-detects Vite — click **Deploy**
5. Add Environment Variables in Vercel Dashboard:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

### Custom Domain on Vercel

1. In Vercel project → Settings → Domains
2. Add your domain (e.g., `tapps.yourdomain.com`)
3. Add the CNAME record in your DNS provider
4. SSL certificate is auto-provisioned

---

### Option A: OnSpace Built-in Domain (Recommended)

1. Click **Publish** in the top-right toolbar
2. Select **Add Existing Domain**
3. Enter your domain (e.g., `apps.yourdomain.com`)
4. Add the provided CNAME/A record to your DNS provider
5. Wait for DNS propagation (usually 5–30 minutes)

### Option B: GitHub Pages

1. Click the **GitHub** button in the top-right toolbar
2. Connect your GitHub account and push the repo
3. In your GitHub repo → **Settings → Pages**
4. Set source to **GitHub Actions** or **gh-pages branch**
5. Add a `CNAME` file in `public/` with your domain:
   ```
   yourdomain.com
   ```
6. In your DNS provider, add:
   ```
   Type: CNAME
   Name: www (or @)
   Value: yourgithubusername.github.io
   ```

### GitHub Actions Auto-Deploy

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 18
      - run: npm install
      - run: npm run build
      - uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./dist
          cname: yourdomain.com  # ← replace with your domain
```

---

## 🔑 Environment Variables

After cloning from GitHub, create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

These are found in your OnSpace Cloud dashboard.
