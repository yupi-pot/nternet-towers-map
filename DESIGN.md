# cellr — Cell Tower Map

**Find, filter, and navigate to nearby cell towers.** cellr pulls live data from OpenCelliD and displays towers on a clustered map, sorted list, and compass-guided detail view.

---

## Features

### Map
- Clustered map of cell towers in the current viewport
- Radio filter chips — 2G / 3G / 4G / 5G (multi-select, smart toggle)
- "Search this area" prompt after panning
- Tap cluster → zooms to expand
- Tap tower → opens detail modal
- Tower count in glass status bar

### List
- Towers sorted by distance from user
- Same radio filter chips as map
- Confidence legend (high / medium / low based on sample count)
- Each row: network badge, carrier, cell ID, range, distance, confidence

### Tower Detail
- Carrier name + network badge + confidence rating
- Live compass arrow rotates toward tower (magnetometer + bearing calc)
- Distance & bearing (e.g. "NE · 420 m")
- Cell identifiers: Cell ID, MCC/MNC, LAC, coordinates, coverage radius
- Copy coordinates, Export as JSON, Flag inaccurate

### Onboarding
- 4-slide carousel (discover → data → compass → location permission)
- Skippable; completion persisted to SecureStore

### Premium (mocked)
- Paywall modal — $4.99/mo or $29.99/yr
- Gated features: unlimited towers, compass, carrier filter, export, live signal, home widget

---

## Architecture

```
App
├── _layout.tsx         — Sentry init, font load, onboarding gate, PremiumProvider
├── (tabs)/
│   ├── index.tsx       — Map tab (MapView + Supercluster)
│   └── two.tsx         — List tab (FlatList sorted by distance)
└── onboarding.tsx      — Paginated onboarding carousel

src/
├── api/opencellid.ts   — Fetches towers by bounding box (2×2 tile grid)
├── context/
│   ├── TowersContext   — towers, location, loading state, refresh
│   └── PremiumContext  — isPremium, persisted to SecureStore
├── hooks/
│   ├── useLocation     — GPS position + permission
│   ├── useTowers       — API fetch + dedup, 300ms debounce
│   └── useCompass      — Magnetometer heading, 250ms interval
├── components/
│   ├── TowerDetailModal
│   └── PaywallModal
└── utils/
    ├── haversineDistance, bearingTo, cardinalDirection
    ├── confidenceLevel, formatDistance, formatBearing
    └── getCarrierName (500+ worldwide MCC/MNC mappings)
```

## Data Flow

```
OpenCelliD API → useTowers → TowersContext → Map / List tabs
useLocation → TowersContext (bounding box), List (sort), Detail (distance/bearing)
useCompass → TowerDetailModal (live arrow rotation)
```

## Stack

| Layer | Choice |
|---|---|
| Framework | Expo SDK 54 (Router) |
| Maps | react-native-maps |
| Clustering | supercluster (pure JS) |
| Error tracking | Sentry (`@sentry/react-native`) |
| Storage | expo-secure-store |
| Sensors | expo-sensors (magnetometer) |
| Data | OpenCelliD (REST, public API) |
