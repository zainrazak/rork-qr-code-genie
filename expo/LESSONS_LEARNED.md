# Expo + React Native iOS App Launch Playbook

A complete, step-by-step guide for launching iOS apps built with Expo/React Native — from first build to App Store approval. Based on real experience shipping QR Code Genie (23 builds, 3 debugging sessions).

---

## Table of Contents
1. [App Store Submission Checklist](#app-store-submission-checklist)
2. [RevenueCat Subscription Setup](#revenuecat-subscription-setup)
3. [EAS Build & Deploy](#eas-build--deploy)
4. [Problems & Fixes Reference](#problems--fixes-reference)
5. [Debugging Native Crashes](#debugging-native-crashes)
6. [Key Versions](#key-versions)

---

## App Store Submission Checklist

### Phase 1: Apple Developer Setup
> Do this once per account

- [ ] Enroll in Apple Developer Program ($99/year)
- [ ] Accept **Paid Applications Agreement** — App Store Connect → Business → Agreements
  - Requires: bank account, tax info, contact info
  - ⚠️ If not active, subscriptions/IAPs will silently fail to load
- [ ] Set up an **App Store Connect API Key** (for RevenueCat) — Users and Access → Integrations → In-App Purchase

### Phase 2: App Store Connect — App Setup
> Do this once per app

- [ ] Create new app in App Store Connect
- [ ] Set **Bundle ID** (must match `app.json` → `ios.bundleIdentifier`)
- [ ] Select **Primary Category** — App Information → Category (e.g., Utilities, Productivity)
- [ ] Set **Content Rights** — App Information → scroll to Content Rights → "This app does not contain, show, or access third-party content" (if applicable)
- [ ] Set **Age Rating** — App Information → Age Rating → fill out questionnaire

### Phase 3: Subscriptions / In-App Purchases
> Do this before testing payments on TestFlight

#### App Store Connect Side
- [ ] Create **Subscription Group** — Subscriptions → ➕
  - [ ] Add **Group Localization** (display name for the group itself — THIS IS EASILY MISSED)
- [ ] Create **Subscription Products** inside the group
  - [ ] Set **Reference Name** (internal only, e.g., "Pro Monthly")
  - [ ] Set **Product ID** (e.g., `com.yourapp.pro.monthly` — must match RevenueCat exactly)
  - [ ] Set **Subscription Duration** (1 month, 1 year, etc.)
  - [ ] Set **Price** — Subscription Pricing → ➕
  - [ ] Add **Localization** (Display Name + Description for each product)
  - [ ] Add **Review Screenshot** (screenshot of your paywall)
- [ ] Verify status is **"Ready to Submit"** (not "Missing Metadata")

#### RevenueCat Side
- [ ] Create **Project** in RevenueCat dashboard
- [ ] Add **App** with correct bundle ID + platform (iOS)
- [ ] Add **App Store Connect API Key** (from Phase 1)
- [ ] Create **Products** with IDs matching App Store Connect exactly
- [ ] Create **Entitlements** (e.g., "pro") and attach products
- [ ] Create **Offerings** with packages:
  - `$rc_monthly` → your monthly product
  - `$rc_annual` → your yearly product
- [ ] Set one offering as **Current**
- [ ] Copy your **iOS API Key** (starts with `appl_`) — this goes in your app code

### Phase 4: App Version — Prepare for Submission
> Do this for each version you submit

#### Screenshots (required)
- [ ] Take screenshots from TestFlight on your device
- [ ] Resize to **1284 × 2778px** (iPhone 6.5" — minimum required)
  ```bash
  # Resize all PNGs in a folder
  mkdir resized
  for f in *.png *.PNG; do
    sips -z 2778 1284 "$f" --out "resized/${f%.*}.png"
  done
  ```
- [ ] Upload 3-10 screenshots in this order:
  1. Home/main screen (first impression)
  2. Core feature in action
  3. Secondary feature
  4. Additional screens
- ⚠️ **DO NOT include screenshots showing pricing, payment UI, or subscription purchase dialogs** — Apple will reject them. Paywall/subscription screens should NOT be in your App Store screenshots.

#### Text Fields
- [ ] **Promotional Text** (170 chars, changeable without review)
  > Short punchy description of your app's value proposition
- [ ] **Description** (4000 chars)
  > What the app does, key features, free vs paid tiers
- [ ] **Keywords** (100 chars, comma-separated, no spaces after commas)
  > e.g., `qr code,qr scanner,qr generator,barcode,scan`
- [ ] **Support URL** (required — must be a real webpage, not email)
  > Host a simple support page on GitHub Pages (see below)
- [ ] **Marketing URL** (optional)
- [ ] **Copyright** — e.g., `2026 Your Name`
- [ ] **Version** — should already be set (e.g., 1.0)

#### Build
- [ ] Click **"Add Build"** and select your latest build from EAS Submit
  > Build must finish processing in App Store Connect first (can take 10-30 min after upload)

#### In-App Purchases and Subscriptions
- [ ] Scroll down to this section on the version page
- [ ] Click **Edit** and select all your subscription products
  > This attaches them to this version for review

#### App Review Information
- [ ] **Sign-In Information** — uncheck "Sign-in required" if no login needed
  > If login required: provide demo username + password
- [ ] **Contact Information** — your name, phone, email
- [ ] **Notes** (optional) — any special instructions for reviewers

#### App Store Version Release
- [ ] Choose release method:
  - "Automatically release this version" (goes live immediately after approval)
  - "Manually release this version" (you control when it goes live)

### Phase 5: Privacy, Legal & EULA
> Required before submission — Apple WILL reject without these (Guideline 3.1.2(c))

#### Privacy Policy
- [ ] Create a **dedicated Privacy Policy page** hosted on the web (e.g., GitHub Pages)
- [ ] Set **Privacy Policy URL** in App Store Connect → App Privacy section
- [ ] **App Privacy Details** — App Privacy → Get Started
  > Answer data collection questionnaire. If your app stores everything locally:
  > Select **"No, we do not collect data from this app"**

#### Terms of Use / EULA (required for subscription apps)
- [ ] Create a **dedicated Terms of Use page** hosted on the web
- [ ] Add a **custom EULA** in App Store Connect:
  1. Go to App Information → scroll to License Agreement → click Edit
  2. Select "Apply a custom EULA to all chosen countries or regions"
  3. Paste your EULA as **plain text** (no HTML — tags are stripped)
  4. Select all 175 countries → click Done → Save
  - ⚠️ The EULA must meet [Apple's minimum terms](https://apple.com/legal/internet-services/itunes/dev/minterms/) — include all 10 required sections
  - ⚠️ Must include: developer name, contact info, subscription pricing/terms, warranty, third-party beneficiary clause (Apple)

#### In-App Links (required for subscription apps)
- [ ] Add **functional tappable links** to Terms of Use AND Privacy Policy **inside the app's purchase flow** (paywall screen)
  - Must open in browser via `Linking.openURL()`
  - Plain text legal disclaimers are NOT sufficient — Apple requires clickable links
  - Example:
    ```typescript
    <TouchableOpacity onPress={() => Linking.openURL('https://yoursite.com/terms')}>
      <Text style={styles.legalLink}>Terms of Use (EULA)</Text>
    </TouchableOpacity>
    ```

### Phase 6: Submit
- [ ] Click **"Add for Review"**
- [ ] Confirm all warnings are resolved
- [ ] Submit — typical review time is 24-48 hours

---

## Support Page Setup (GitHub Pages — Free)

1. Create `docs/index.html` in your repo with a simple support page including:
   - Contact/support email
   - FAQ section
   - Subscription terms (required by Apple for subscription apps)
   - Privacy policy section
2. Push to GitHub
3. Make repo public (or use GitHub Pro for private repos)
4. Enable GitHub Pages:
   ```bash
   # Via CLI
   gh api repos/OWNER/REPO/pages -X POST \
     -f "source[branch]=main" -f "source[path]=/docs"
   ```
   Or: Settings → Pages → Source: Deploy from branch → main → /docs
5. URL will be: `https://OWNER.github.io/REPO/`

---

## RevenueCat Subscription Setup

### Code Integration (Deferred Init Pattern)

⚠️ **Critical for Expo 54 + RN 0.81 + React 19**: Do NOT initialize RevenueCat at app boot. Use deferred initialization.

```typescript
// providers/RevenueCatProvider.tsx

const REVENUECAT_API_KEY_IOS = 'appl_your_key_here';
const ENTITLEMENT_ID = 'pro';

let rcConfigured = false;
let rcModule: any = null;

// Call this ONLY when paywall opens, NOT at app boot
const initializeRC = useCallback(async () => {
  if (Platform.OS === 'web' || rcConfigured) return;

  // 1. Lazy require (safe — doesn't crash)
  if (!rcModule) {
    const mod = require('react-native-purchases');
    rcModule = mod.default || mod;
  }

  // 2. Pre-set log handler BEFORE configure (workaround for issue #1436)
  try {
    rcModule.setLogHandler((level, msg) => {
      console.log(`[RC/${level}] ${msg}`);
    });
  } catch (e) {}

  // 3. Configure
  rcModule.configure({ apiKey: REVENUECAT_API_KEY_IOS });
  rcConfigured = true;

  // 4. Fetch customer info + offerings
  const customerInfo = await rcModule.getCustomerInfo();
  const offerings = await rcModule.getOfferings();
  // ...
}, []);
```

### Common RevenueCat Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Wrong API key" | Using `test_` prefix key | Use `appl_` prefix key for iOS |
| "None of the products could be fetched" | Missing metadata in App Store Connect | Add subscription group localization + product metadata |
| "Configuration issue" (error 23) | Products not available in StoreKit | Check Paid Applications Agreement + product status |
| App crashes on `configure()` | Issue #1436 on Expo 54/RN 0.81/React 19 | Use deferred init + pre-set log handler |

---

## EAS Build & Deploy

### eas.json Configuration
```json
{
  "cli": { "version": ">= 16.0.1", "appVersionSource": "remote" },
  "build": {
    "production": {
      "autoIncrement": true,
      "cache": { "key": "v1" },
      "ios": { "resourceClass": "m-medium" }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "appleTeamId": "YOUR_TEAM_ID",
        "ascAppId": "YOUR_ASC_APP_ID"
      }
    }
  }
}
```

### Build + Auto-Submit to TestFlight
```bash
npx eas-cli build --platform ios --profile production --auto-submit --non-interactive
```

### Key Rules
- **Bump cache key** when changing native dependencies: `"key": "v2"` → `"key": "v3"`
- **Keep lockfile in sync** — run `bun install` locally after any `package.json` change, commit `bun.lock`
- **Pin native SDK versions** — use `"9.10.4"` not `"^9.10.4"` for critical packages
- **Don't use patch-package with bun** — patches fail to apply on EAS Build servers

---

## Problems & Fixes Reference

### 1. RevenueCat Crashes on App Launch
**Symptom:** App crashes immediately on TestFlight when RevenueCat initializes at boot.
**Root Cause:** RevenueCat SDK [issue #1436](https://github.com/RevenueCat/react-native-purchases/issues/1436) — `setLogHandler()` inside `configure()` triggers `Reflect.construct.apply` crash on Expo 54 + RN 0.81 + React 19 + New Architecture.

**What didn't work:** try/catch (native crash), monkey-patching NativeModules (immutable TurboModule proxies), patch-package (bun incompatibility on EAS).

**Fix:** Deferred initialization + pre-set log handler (see code above).

### 2. Invalid API Key → Crash Loop
**Symptom:** First open shows "Wrong API key", subsequent opens crash.
**Fix:** Use correct `appl_` prefix API key from RevenueCat dashboard.

### 3. "No Offerings Available" / Products Not Found
**Symptom:** Paywall opens but can't load products.
**Fix:** Add localization at the subscription GROUP level (not just individual products) in App Store Connect.

### 4. Screenshot Dimensions Rejected
**Symptom:** App Store Connect rejects uploaded screenshots.
**Fix:** Resize to exactly 1284 × 2778px:
```bash
sips -z 2778 1284 input.png --out output.png
```

### 5. EAS Build Fails — Frozen Lockfile
**Symptom:** `bun install --frozen-lockfile` error on EAS.
**Fix:** Run `bun install` locally, commit updated `bun.lock`.

### 6. GitHub Pages Won't Enable
**Symptom:** "Upgrade or make this repository public to enable Pages"
**Fix:** Make repo public, or use `gh api` to enable Pages programmatically.

### 7. App Review Rejection — Guideline 3.1.2(c) (Missing EULA & Privacy Links)
**Symptom:** App rejected with: "The submission did not include all the required information for apps offering auto-renewable subscriptions." Specifically missing functional links to Terms of Use (EULA) and Privacy Policy within the app.

**What Apple requires for subscription apps:**
1. **In the app itself** (within the purchase flow / paywall):
   - Title of auto-renewing subscription
   - Length and price of subscription
   - **Functional tappable links** to Terms of Use (EULA) and Privacy Policy (plain text is NOT enough)
2. **In App Store Connect metadata:**
   - Privacy Policy URL set in the Privacy Policy field
   - Custom EULA added via App Information → License Agreement → Edit → paste plain text EULA meeting [Apple's minimum terms](https://apple.com/legal/internet-services/itunes/dev/minterms/)

**Fix (3 parts):**
1. Create dedicated Terms of Use and Privacy Policy web pages (e.g., `docs/terms.html`, `docs/privacy.html` on GitHub Pages)
2. Add `TouchableOpacity` + `Linking.openURL()` links in the paywall screen pointing to those pages
3. Add custom EULA in App Store Connect (App Information → License Agreement) as plain text covering all 10 of Apple's minimum required sections

**Key Lesson:** Apple's standard EULA is NOT shown on your product page. For subscription apps, you MUST provide a custom EULA with subscription details, or Apple will reject.

### 8. Screenshots Containing Pricing Get Rejected
**Symptom:** App Store screenshots showing subscription prices, payment dialogs, or purchase confirmation UI are rejected.

**Fix:** Never include paywall, pricing, or payment screenshots in your App Store listing screenshots. Only show app functionality screens (home, features, scan, history, etc.).

---

## Debugging Native Crashes

When facing crashes that can't be caught by JS try/catch:

1. **Strip everything** — Remove all SDK calls, verify the app boots clean
2. **Add require() only** — Confirm the module can be loaded without crash
3. **Add one method at a time** — Each build tests exactly one additional API call
4. **Show debug UI on screen** — Add visible banners/text since you can't access console on TestFlight
5. **Never truncate errors** — Show full error messages including `underlyingErrorMessage`, `readableErrorCode`, `code`
6. **Check GitHub issues** — Most native crashes are known issues with documented workarounds

---

## Key Versions (Working Combination — March 2026)
```json
{
  "expo": "~54.0.0",
  "react": "19.1.0",
  "react-native": "0.81.5",
  "react-native-purchases": "9.10.4",
  "expo-camera": "~16.1.6",
  "expo-haptics": "~14.1.4"
}
```

---

## Quick Launch Checklist (TL;DR)

```
□ Apple Developer account active + Paid Applications Agreement signed
□ App created in App Store Connect with correct bundle ID
□ Subscriptions created with FULL metadata (group + product level)
□ RevenueCat configured with matching product IDs + appl_ API key
□ App builds and runs on TestFlight without crashes
□ Payments work in TestFlight sandbox
□ Screenshots resized to 1284 × 2778px (NO pricing/payment screenshots!)
□ Support page live (GitHub Pages)
□ Terms of Use page live + Custom EULA pasted in App Store Connect
□ Privacy Policy page live + URL set in App Store Connect
□ Paywall has TAPPABLE LINKS to Terms of Use and Privacy Policy
□ App Privacy questionnaire completed
□ App Store listing complete: description, keywords, screenshots, category
□ Content Rights set in App Information
□ Build attached to version + subscriptions attached to version
□ Submit for review
```

---

*Last updated: March 2026*
*Total builds to stable: 23*
*Based on: QR Code Genie — Expo SDK 54 + RevenueCat*
