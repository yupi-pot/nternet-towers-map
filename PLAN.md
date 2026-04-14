# Cellr — MVP Product Plan

## The one core loop

> Open app → see accurate nearby towers → tap a tower → get carrier / type / distance / compass bearing → position yourself or your antenna.

---

## What's already built

| Feature | Status |
|---|---|
| Map with clustered tower pins | Done |
| Tower detail card (cell ID, MCC/MNC, coords, signal, range) | Done |
| Network type filter (2G/3G/4G/5G chips) | Done |
| Search-this-area button | Done |
| My location button | Done |
| Tower list tab | Done |
| OpenCelliD data source | Done |

---

## MVP gaps to close (before launch)

### P0 — must ship

| Feature | What to build | Notes |
|---|---|---|
| **Compass bearing to selected tower** | Show degrees + cardinal direction (N/NE/etc.) in the tower detail card using `expo-sensors` magnetometer + GPS bearing calc | #1 use case for antenna pointers — competitors charge for this |
| **Carrier name from MCC/MNC** | Map MCC/MNC → human-readable carrier name (T-Mobile, AT&T, Verizon, etc.) | Currently shows raw MCC/MNC numbers — confusing to users |
| **Distance to tower** | Show `X.X mi` / `X km` in detail card and tower list | Already have coords, just needs the calc |
| **Data confidence indicator** | Show `High / Medium / Low` badge per tower based on `samples` count | Directly addresses #1 competitor complaint (inaccurate towers) |

### P1 — ship in first update

| Feature | What to build |
|---|---|
| **Carrier filter** | Chip row to filter by carrier (T-Mobile / AT&T / Verizon / Other) |
| **Live signal strength** | Show device's current dBm using `expo-cellular` — validates tower data |
| **Home screen widget** | iOS widget showing nearest tower + network type (no competitor has this) |
| **Flag inaccurate tower** | Button in detail card to report a bad pin — builds trust + crowdsourced accuracy |

### Cut from v1 (explicitly)

- VPN — irrelevant, raises privacy concerns
- Speed test — Ookla owns this category
- AR mode — broken in every competitor, too complex
- Coverage maps — need crowdsourced data we don't have
- Ads — entire category is poisoned by ad-stuffed scam apps; launch clean

---

## Free vs Premium

### Free tier (always free — prove accuracy first)

- Map with nearest **10 towers**
- Tower detail card (carrier, network type, coordinates, distance)
- Network type filter (2G / 3G / 4G / **5G included** — don't paywall this, it's the #1 complaint about competitors)
- My location
- Flag inaccurate tower

### Premium — $4.99/month or $29.99/year

| Feature | Why it's premium |
|---|---|
| **Unlimited towers on map** | Core expansion — free shows 10 nearby |
| **Compass bearing to tower** | Power-user feature for antenna pointing |
| **Carrier filter** | Useful for multi-carrier comparisons |
| **Export tower list** | CSV/JSON for installers and field workers |
| **Live signal strength (dBm)** | Advanced diagnostic |
| **Home screen widget** | Nearest tower at a glance |

**Trial:** Genuine 7-day free trial with full premium access. No weekly subscription tier (associated with scam apps in user reviews).

---

## Data accuracy strategy (the real differentiator)

Competitors fail on accuracy. Win here.

1. **OpenCelliD** — already integrated (~40M cells globally)
2. **FCC ASR database** — physical tower locations for US (more accurate than cell-level data) — cross-reference with OpenCelliD to boost confidence scores
3. **FCC Universal Licensing System** — accurate carrier assignments for US towers
4. **Confidence score** — `High` (multiple sources agree + recent samples), `Medium` (one source, older data), `Low` (single observation, stale)
5. **User corrections** — flag button feeds a correction queue; verified corrections update confidence score

---

## Monetization model

```
Free tier → 7-day full trial → $4.99/mo or $29.99/yr
```

- No A/B price testing at launch (erodes trust)
- No weekly tier (scam app signal)
- No ads

B2B opportunity (post-MVP): aggregate anonymized tower accuracy data → sell to telecoms / signal booster companies. This is where Ookla ($29.8M/yr) and Opensignal ($16M/yr) make their real money.

---

## Launch success metrics

| Metric | Target |
|---|---|
| App Store rating | > 4.2 stars with > 100 organic reviews in 60 days |
| Free → paid conversion | > 5% (industry avg 2–5%) |
| Week-1 paid churn | < 40% |
| Most-used premium feature | Determines v2 focus |

---

## v2 roadmap (let data decide)

- If **compass** is most used → double down on antenna-pointing tools (azimuth, elevation, beam width)
- If **carrier filter** is most used → build carrier comparison view
- If **export** is most used → pursue B2B / API tier ($499–$999/mo like FindTower)
- If **widget** is most used → home screen signal dashboard
