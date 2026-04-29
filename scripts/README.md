# Cell Tower Import Scripts

## One-time setup

```bash
cd scripts
pip install -r requirements.txt
cp .env.example .env
# Edit .env — add your DB_PASSWORD from:
# Supabase Dashboard → Project Settings → Database → Connection string
```

## Initial MVP import (Spain, France, Germany, UK, Netherlands)

```bash
source .env && python import_towers.py
```

## Import specific countries by MCC

```bash
source .env && python import_towers.py --mccs 214        # Spain only
source .env && python import_towers.py --mccs 214 208 262
```

## Import everything (207 files, takes ~30 min)

```bash
source .env && python import_towers.py --all
```

---

## Monthly automated updates

The `update-towers` Edge Function is deployed and scheduled to run on the
1st of every month at 03:00 UTC via pg_cron.

**One-time activation** — run this SQL once in Supabase SQL Editor:

```sql
ALTER DATABASE postgres
  SET app.service_role_key = '<your_service_role_key>';
```

Get the service role key from: Supabase Dashboard → Project Settings → API → service_role (secret).

### Trigger an update manually

```bash
curl -X POST https://nykisarixoohwxqbxdnz.supabase.co/functions/v1/update-towers \
  -H "Authorization: Bearer <service_role_key>" \
  -H "Content-Type: application/json" \
  -d '{"mccs": [214]}'
```

---

## API usage (PostgREST)

```
GET https://nykisarixoohwxqbxdnz.supabase.co/rest/v1/cell_towers
  ?mcc=eq.214
  &select=radio,mcc,net,area,cell,lon,lat,range
  &limit=100
```

### Towers near a point (Barcelona: lat=41.385, lon=2.173)

```sql
SELECT * FROM towers_near(41.385, 2.173, 5000);  -- 5km radius
```

Via REST (RPC):
```
POST https://nykisarixoohwxqbxdnz.supabase.co/rest/v1/rpc/towers_near
{ "p_lat": 41.385, "p_lon": 2.173, "p_radius": 5000 }
```
