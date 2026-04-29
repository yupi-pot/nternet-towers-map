#!/usr/bin/env python3
"""
Stream the OpenCelliD full world dump and import only MCCs missing from Supabase.
Processes the gzip stream row-by-row — never loads the full file into memory.
"""

import csv, gzip, io, os, sys, time, json
import requests
from datetime import datetime, timezone
from supabase import create_client

SUPABASE_URL = "https://nykisarixoohwxqbxdnz.supabase.co"
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55a2lzYXJpeG9vaHd4cWJ4ZG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjQyNzksImV4cCI6MjA5MzA0MDI3OX0.YN5vRzHACGAP5l_lTO5ezxrXAEIn65F6YOBp42BYgTo")
OCID_TOKEN   = "pk.57c931092e5f3db890fbbca667e15ac6"
FULL_DUMP_URL = f"https://opencellid.org/ocid/downloads?token={OCID_TOKEN}&type=full&file=cell_towers.csv.gz"
STATUS_FILE  = os.path.join(os.path.dirname(__file__), "mcc_status.json")
BATCH_SIZE   = 500

# MCCs confirmed absent from the DB
MISSING_MCCS = {308, 316, 344, 348, 350, 352, 354, 356, 358, 365,
                404, 405, 430, 431, 467, 541, 549, 550, 626, 633, 654}

def load_status():
    if os.path.exists(STATUS_FILE):
        with open(STATUS_FILE) as f:
            return json.load(f)
    return {}

def save_status(status):
    with open(STATUS_FILE, "w") as f:
        json.dump(status, f, indent=2)

def ts(v):
    try:
        return datetime.fromtimestamp(int(v), tz=timezone.utc).isoformat() if v and v != "0" else None
    except (ValueError, TypeError):
        return None

def oint(v):
    try:
        return int(v) if v and v != "" else None
    except (ValueError, TypeError):
        return None

def parse_row(cols):
    if len(cols) < 14:
        return None
    try:
        lon, lat = float(cols[6]), float(cols[7])
    except (ValueError, IndexError):
        return None
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        return None
    return {
        "radio":      cols[0],
        "mcc":        oint(cols[1]),
        "net":        oint(cols[2]),
        "area":       oint(cols[3]),
        "cell":       oint(cols[4]),
        "unit":       oint(cols[5]),
        "lon":        lon,
        "lat":        lat,
        "range":      oint(cols[8]),
        "samples":    oint(cols[9]),
        "changeable": oint(cols[10]),
        "created_at": ts(cols[11]),
        "updated_at": ts(cols[12]),
        "avg_signal": oint(cols[13]),
    }

def upsert_batch(sb, batch):
    sb.table("cell_towers").upsert(
        batch, on_conflict="radio,mcc,net,area,cell"
    ).execute()

def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    status = load_status()

    print(f"Streaming full dump — filtering {len(MISSING_MCCS)} missing MCCs")
    print(f"URL: {FULL_DUMP_URL}\n")

    t0 = time.time()
    resp = requests.get(FULL_DUMP_URL, stream=True, timeout=600)
    resp.raise_for_status()
    resp.raw.decode_content = False  # get raw bytes for gzip

    mcc_batches: dict[int, list] = {mcc: [] for mcc in MISSING_MCCS}
    mcc_totals:  dict[int, int]  = {mcc: 0  for mcc in MISSING_MCCS}
    rows_scanned = 0

    with gzip.GzipFile(fileobj=resp.raw) as gz:
        reader = csv.reader(io.TextIOWrapper(gz, encoding="utf-8"))
        header = next(reader, None)

        for cols in reader:
            rows_scanned += 1
            if rows_scanned % 500_000 == 0:
                elapsed = time.time() - t0
                found = sum(mcc_totals.values())
                print(f"  scanned {rows_scanned:,} rows  |  {found:,} target rows  |  {elapsed:.0f}s", flush=True)

            try:
                mcc = int(cols[1])
            except (ValueError, IndexError):
                continue
            if mcc not in MISSING_MCCS:
                continue

            row = parse_row(cols)
            if not row:
                continue

            mcc_batches[mcc].append(row)
            if len(mcc_batches[mcc]) >= BATCH_SIZE:
                upsert_batch(sb, mcc_batches[mcc])
                mcc_totals[mcc] += len(mcc_batches[mcc])
                mcc_batches[mcc] = []

    # flush remaining batches
    for mcc, batch in mcc_batches.items():
        if batch:
            upsert_batch(sb, batch)
            mcc_totals[mcc] += len(batch)

    elapsed = time.time() - t0
    print(f"\nDone in {elapsed:.1f}s  |  scanned {rows_scanned:,} rows\n")

    total_imported = 0
    for mcc, count in sorted(mcc_totals.items()):
        if count:
            print(f"  MCC {mcc}: {count:,} rows")
            entry = status.get(str(mcc), {})
            entry.update({"status": "done", "rows": count, "date": datetime.now().date().isoformat(), "source": "full_dump"})
            status[str(mcc)] = entry
            total_imported += count
        else:
            print(f"  MCC {mcc}: no data in full dump")
            entry = status.get(str(mcc), {})
            entry.update({"status": "no_data", "date": datetime.now().date().isoformat(), "source": "full_dump"})
            status[str(mcc)] = entry

    save_status(status)
    print(f"\nTotal imported: {total_imported:,} rows")

if __name__ == "__main__":
    main()
