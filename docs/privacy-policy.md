# Privacy Policy

**Cellr — Cell Tower Map**
**Last updated: May 2, 2026**

## 1. Overview

Cellr ("we", "our", "the app") is a cell tower mapping application. This policy explains what data we collect, how we use it, and your rights.

## 2. Data We Collect

### Location
- We request "While Using the App" location permission to show nearby towers, calculate distances, and display compass bearing.
- Location is used only while the app is open and foreground. We do not track your location in the background.
- Location data is **not transmitted to our servers** and is not stored persistently on the device beyond the current session.

### Device Sensors
- We access the magnetometer (compass) to show antenna bearing direction.
- Sensor data is processed locally and never leaves the device.

### Purchase State
- If you purchase a premium subscription, we store a flag in the device's secure storage (`expo-secure-store`) to remember your premium status locally.
- No payment card data is processed by us. All transactions are handled by Apple App Store or Google Play.
- For subscription status validation, Adapty receives an anonymous platform receipt token and a vendor ID. No name or email is shared with Adapty by Cellr.

### Product Analytics (PostHog)
- We use PostHog for anonymous product analytics (for example: feature usage, screen views, and performance events) to improve the app.
- We do not send your name or email to PostHog.
- Analytics can be disabled in the app settings.

### Crash Reports & Diagnostics
- We use **Sentry** to collect anonymized crash reports and error logs.
- These reports may include device model, OS version, app version, and a stack trace. They do **not** include your location or personal identity.
- Sentry's privacy policy: https://sentry.io/privacy/

## 3. Data We Do Not Collect

- We do not collect your name, email address, or any account information.
- We do not sell data to third parties.

## 4. Third-Party Services

| Service | Purpose | Data sent |
|---------|---------|-----------|
| **Supabase** | Cell tower database backend | Anonymous RPC queries (bounding box coordinates only) |
| **OpenTopoData** | Terrain elevation for coverage overlay | Grid of coordinates near the selected tower |
| **PostHog** | Anonymous product analytics | Anonymous usage events, app/device metadata, random analytics identifiers |
| **AppsFlyer** | Install attribution | Campaign/referrer attribution data; on iOS, IDFA only if ATT permission is granted |
| **Adapty** | Subscription receipt validation and entitlement management | Anonymous App Store/Google Play receipt data and vendor ID |
| **Sentry** | Crash reporting | Anonymized error/device info |
| **Apple / Google** | In-app purchases | Handled entirely by the platform |

## 5. App Tracking Transparency (ATT)

Cellr uses AppsFlyer to attribute installs to the ad or referral source. If you grant App Tracking Transparency permission, your IDFA is shared with AppsFlyer. You can deny this prompt or revoke later in iOS Settings → Privacy → Tracking; the app works fully either way.

## 6. Children's Privacy

Cellr is not directed at children under 13. We do not knowingly collect personal information from children.

## 7. Data Retention

We do not store personal data on our servers. Crash reports retained by Sentry are subject to Sentry's own retention policy (typically 90 days). Analytics and attribution data handled by PostHog, AppsFlyer, and Adapty are retained according to their respective policies.

## 8. Your Rights

You can control permissions (including location and tracking) in your device settings at any time. You can disable PostHog analytics in app settings. You can reset local premium state by uninstalling the app. For privacy inquiries contact: **genue.luben@gmail.com**

## 9. Changes to This Policy

We may update this policy. The "Last updated" date at the top will reflect any changes. Continued use of the app after changes constitutes acceptance.

## 10. Contact

**Eugene Luchinin**
Email: genue.luben@gmail.com
