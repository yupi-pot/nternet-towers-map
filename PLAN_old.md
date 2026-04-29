# Cellr — Internet Towers Map: Implementation Plan

Current stack: Expo SDK 53, expo-router, React Native Maps, Sentry (active), SecureStore.
Not yet installed: ATT, notifications, RevenueCat/AppHud, AppsFlyer, Remote Config.

---

## 1. ATT (App Tracking Transparency)

**Goal:** Request ATT before onboarding on first launch.

**Library:** `expo-tracking-transparency` (already in Expo ecosystem, no native config needed)

**Steps:**
1. `npx expo install expo-tracking-transparency`
2. Add `NSUserTrackingUsageDescription` to `app.json` → `expo.ios.infoPlist`
3. In `app/_layout.tsx`, before showing onboarding, call `requestTrackingPermissionsAsync()` and await result
4. Store result in SecureStore (`attStatus`) so it's only shown once
5. Pass ATT status to AppsFlyer SDK (step 9)

**Key file:** `app/_layout.tsx` (onboarding check is already here at lines ~24–50)

---

## 2. Push Notifications Permission

**Goal:** Request notification permission on screen after onboarding closes.

**Library:** `expo-notifications` (not yet installed)

**Steps:**
1. `npx expo install expo-notifications`
2. Add `expo-notifications` plugin to `app.json` plugins array
3. Create `app/notifications-prompt.tsx` — a simple full-screen prompt screen with "Allow" / "Later" buttons
4. After onboarding completes (router.replace), navigate to `notifications-prompt` before going to `(tabs)`
5. On "Allow": call `Notifications.requestPermissionsAsync()`
6. On both actions: navigate to `(tabs)`
7. Store flag `hasSeenNotificationsPrompt` in SecureStore to avoid re-showing

**Key files:** `app/onboarding.tsx` (completion handler), `app/_layout.tsx`

---

## 3. App Rating After Paywall Close

**Goal:** Prompt for App Store rating after the user dismisses the paywall.

**Library:** `expo-store-review` (included with Expo, no install needed)

**Steps:**
1. In `src/components/PaywallModal.tsx`, import `StoreReview` from `expo-store-review`
2. On modal close (`onClose` callback), call `StoreReview.requestReview()` wrapped in `StoreReview.isAvailableAsync()` check
3. Only trigger once — add flag `hasRequestedReview` in SecureStore; skip if already shown
4. Add a delay of 500ms after close to avoid janky UX

---

## 4. Paywall on Every Launch

**Goal:** Show paywall on every cold launch for non-premium users.

**Current state:** `PaywallModal` exists but is not connected to app launch.

**Steps:**
1. In `app/_layout.tsx`, after onboarding check and ATT/notifications prompts, check `isPremium` from `PremiumContext`
2. If not premium → set `showPaywall = true` in root state, render `<PaywallModal>` over the entire navigator
3. Use `useEffect` with no dependencies (or `useFocusEffect` on app foreground) to trigger on each launch
4. When PaywallModal closes → trigger App Rating (step 3)

---

## 5. Free Tier: Map + Tower Card Only (Filters Under Paywall)

**Goal:** Non-premium users get map + tower detail; filters are locked.

**Current state:** Filters exist in `app/(tabs)/index.tsx` (radio filter chips 2G/3G/4G/5G). `PremiumContext` has `isPremium` flag.

**Steps:**
1. In `app/(tabs)/index.tsx`, wrap filter chips in a conditional: if `!isPremium` → show lock overlay on chip press → open paywall
2. In `src/components/TowerDetailModal.tsx` — full access (no paywall needed here)
3. In `app/(tabs)/two.tsx` (List) — filter chips also need same paywall gate
4. Add a subtle lock icon or blur overlay on filter chips for non-premium users

---

## 6. Remote Config: Close Button on Paywall

**Goal:** Toggle paywall close button visibility and opacity via Remote Config.

**Library:** `@react-native-firebase/remote-config` OR `expo-firebase-analytics` with Remote Config
  - Recommended: `@react-native-firebase/app` + `@react-native-firebase/remote-config`
  - Alternative (simpler): Expo's `expo-firebase-recaptcha` + Firebase REST API

**Steps:**
1. Set up Firebase project for `map.cellr.app`
2. `npx expo install @react-native-firebase/app @react-native-firebase/remote-config`
3. Add `google-services.json` (Android) and `GoogleService-Info.plist` (iOS) to project
4. Add plugins to `app.json`: `@react-native-firebase/app`
5. Create Remote Config parameters:
   - `paywall_close_button_enabled` (boolean, default: `true`)
   - `paywall_close_button_opacity` (number, default: `1.0`)
6. In `src/components/PaywallModal.tsx`, fetch these values on mount and apply to close button
7. Set minimum fetch interval to 3600s (production) / 0 (dev)

---

## 7. Remote Config: Default Selected Plan on Paywall

**Goal:** Preselect monthly or yearly plan via Remote Config.

**Steps (builds on step 6 Firebase setup):**
1. Add Remote Config parameter: `paywall_default_plan` (string: `"monthly"` | `"yearly"`, default: `"yearly"`)
2. In `src/components/PaywallModal.tsx`, read value on mount and set `selectedPlan` state accordingly
3. Fetch Remote Config before showing paywall (or use cached values with `fetchAndActivate`)

---

## 8. Settings Screen

**Goal:** Settings section with Privacy Policy, Terms, Language, Contacts, App Version, User ID.

**Steps:**
1. Create `app/(tabs)/settings.tsx` — new tab screen
2. Add settings tab to `app/(tabs)/_layout.tsx` (3rd tab, gear icon from `lucide-react-native`)
3. Build grouped list UI (SectionList or flat View sections):

   **Section: Account**
   - User ID (from AppHud/RevenueCat customer ID) — tap to copy via `expo-clipboard` ✓ (already installed)

   **Section: Legal**
   - Privacy Policy → `Linking.openURL(PRIVACY_URL)`
   - Terms of Use → `Linking.openURL(TERMS_URL)`

   **Section: App**
   - Language → `Linking.openSettings()` (opens iOS Settings for language)
   - Contacts → compose email with `Linking.openURL('mailto:support@cellr.app?subject=...&body=UserID:...|Version:...|Device:...')`
   - App Version → read from `expo-constants` (`Constants.expoConfig.version`) — display as "Cellr v{version}"

4. User ID: use `Purchases.getAppUserID()` (RevenueCat) or `Apphud.userId()` (AppHud)
5. Device info for Contacts email: use `expo-device` (`Device.modelName`, `Device.osVersion`)
   - `npx expo install expo-device`

---

## 9. SDKs: AppHud / RevenueCat + AppsFlyer

### AppHud or RevenueCat (choose one for IAP)

**Recommended: RevenueCat** (better React Native support, active community)
- `npx expo install react-native-purchases`
- Initialize in `app/_layout.tsx` with API key from RevenueCat dashboard
- Replace mock `activatePremium()` in `src/context/PremiumContext.tsx` with real purchase flow
- Add `paywall_shown` event: `await Purchases.logEvent('paywall_shown')` when `PaywallModal` mounts

**If AppHud preferred:**
- `npm install apphud-react-native`
- Initialize with App Key from AppHud dashboard
- Use `Apphud.paywallShown(paywall)` event
- User ID: `Apphud.userId()`

### AppsFlyer
1. `npm install react-native-appsflyer`
2. Add native config (iOS: `AppsFlyerLib.framework` via pod, Android: gradle dependency)
3. Initialize in `app/_layout.tsx` with Dev Key + App ID
4. After ATT result (step 1): pass IDFA to AppsFlyer via `appsFlyer.setAdvertisingId(idfa)`
5. Track events:
   - `appsFlyer.logEvent('paywall_shown', {})` on paywall mount
   - `appsFlyer.logEvent('purchase_completed', { revenue, currency })` on successful purchase

---

## 10. Localization (i18n)

**Goal:** Support EN, RU, ES/MX, PT/BR, DE, FR, IT, SW, PL, NO (and more).

**Library:** `i18next` + `react-i18next` + `expo-localization`

**Steps:**
1. `npm install i18next react-i18next`
2. `npx expo install expo-localization`
3. Create `src/i18n/index.ts` — configure i18next with `expo-localization` detector
4. Create locale files: `src/i18n/locales/{en,ru,es,pt,de,fr,it,sv,pl,no}.json`
5. Wrap app in `I18nextProvider` in `app/_layout.tsx`
6. Replace all hardcoded strings in:
   - `app/onboarding.tsx`
   - `src/components/PaywallModal.tsx`
   - `src/components/TowerDetailModal.tsx`
   - `app/(tabs)/index.tsx`, `two.tsx`
   - Settings screen (step 8)
7. Language switch in Settings → `Linking.openSettings()` (iOS uses system language)
8. For dynamic language switching within app (optional): store preferred language in SecureStore and reinitialize i18next

**Locale codes for App Store:** en-US, ru, es-MX, pt-BR, de-DE, fr-FR, it, sv, pl, no

---

## Implementation Order

| Priority | Step | Complexity | Dependencies |
|----------|------|------------|--------------|
| 1 | Step 1 — ATT | Low | None |
| 2 | Step 4 — Paywall on launch | Low | RevenueCat (step 9) |
| 3 | Step 9 — RevenueCat + AppsFlyer | High | Firebase (step 6) |
| 4 | Step 2 — Notifications prompt | Low | None |
| 5 | Step 5 — Free tier gates | Low | PremiumContext |
| 6 | Step 6+7 — Remote Config | Medium | Firebase |
| 7 | Step 8 — Settings screen | Medium | RevenueCat user ID |
| 8 | Step 3 — App rating | Low | Paywall close |
| 9 | Step 10 — i18n | High | All screens done |
