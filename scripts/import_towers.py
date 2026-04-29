#!/usr/bin/env python3
"""
OpenCelliD → Supabase importer (REST API via supabase-py).

Usage:
  python3 import_towers.py                   # load MVP countries
  python3 import_towers.py --mccs 214 208    # specific MCCs
  python3 import_towers.py --all             # all country files
"""

import gzip, io, os, sys, time, argparse, csv, requests
from datetime import datetime, timezone
from supabase import create_client

SUPABASE_URL  = "https://nykisarixoohwxqbxdnz.supabase.co"
SUPABASE_KEY  = os.getenv("SUPABASE_KEY", "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55a2lzYXJpeG9vaHd4cWJ4ZG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjQyNzksImV4cCI6MjA5MzA0MDI3OX0.YN5vRzHACGAP5l_lTO5ezxrXAEIn65F6YOBp42BYgTo")
OCID_TOKEN    = "pk.57c931092e5f3db890fbbca667e15ac6"
OCID_URL      = "https://opencellid.org/ocid/downloads"
BATCH_SIZE    = 500

MVP_MCCS = [214, 208, 262, 234, 204]

ALL_MCCS = [
    202, 204, 206, 208, 212, 213, 214, 216, 218, 219,
    220, 221, 222, 226, 228, 230, 231, 232, 234, 238,
    240, 242, 244, 246, 247, 248, 250, 255, 257, 259,
    260, 262, 266, 268, 270, 272, 274, 276, 278, 280,
    282, 283, 284, 286, 288, 289, 290, 292, 293, 294,
    295, 297, 302, 308, 310, 311, 312, 313, 314, 316,
    330, 334, 338, 340, 342, 344, 346, 348, 350, 352,
    354, 356, 358, 360, 362, 363, 364, 365, 366, 368,
    370, 372, 374, 376, 400, 401, 402, 404, 405, 410,
    412, 413, 414, 415, 416, 417, 418, 419, 420, 421,
    422, 424, 425, 426, 427, 428, 429, 430, 431, 432,
    434, 436, 437, 438, 440, 441, 450, 452, 454, 455,
    456, 457, 460, 466, 467, 470, 472, 502, 505, 510,
    514, 515, 520, 525, 528, 530, 537, 539, 541, 546,
    547, 549, 550, 602, 603, 604, 605, 606, 607, 608,
    609, 610, 611, 612, 613, 614, 615, 616, 617, 618,
    619, 620, 621, 622, 623, 624, 625, 626, 627, 628,
    629, 630, 631, 632, 633, 634, 635, 636, 638, 639,
    640, 641, 642, 643, 645, 646, 648, 649, 650, 651,
    652, 653, 654, 655, 657, 659, 702, 704, 706, 708,
    710, 712, 714, 716, 722, 724, 730, 732, 734, 736,
    738, 740, 744, 746, 748,
]

COLS = ["radio","mcc","net","area","cell","unit","lon","lat","range","samples","changeable","created","updated","averageSignal"]

def download_rows(mcc):
    url = f"{OCID_URL}?token={OCID_TOKEN}&type=mcc&file={mcc}.csv.gz"
    print(f"  Downloading MCC {mcc} … ", end="", flush=True)
    resp = requests.get(url, timeout=120)
    if resp.status_code == 404:
        print("no data"); return []
    resp.raise_for_status()
    raw = gzip.decompress(resp.content).decode("utf-8")
    lines = raw.strip().splitlines()
    # detect header
    first = lines[0].split(",")
    if first[0].lower() == "radio":
        lines = lines[1:]
    print(f"{len(lines):,} rows")
    return lines

def parse_batch(lines):
    rows = []
    for line in lines:
        cols = line.split(",")
        if len(cols) < 14:
            continue
        try:
            lon, lat = float(cols[6]), float(cols[7])
        except ValueError:
            continue
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            continue

        def ts(v):
            return datetime.fromtimestamp(int(v), tz=timezone.utc).isoformat() if v and v != "0" else None
        def oint(v):
            return int(v) if v and v != "" else None

        rows.append({
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
        })
    return rows

def upsert(sb, rows):
    loaded = 0
    for i in range(0, len(rows), BATCH_SIZE):
        batch = rows[i:i+BATCH_SIZE]
        res = sb.table("cell_towers").upsert(
            batch, on_conflict="radio,mcc,net,area,cell"
        ).execute()
        loaded += len(batch)
        print(f"    {loaded:,}/{len(rows):,}", end="\r", flush=True)
    print()
    return loaded

def main():
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group()
    group.add_argument("--mccs", nargs="+", type=int)
    group.add_argument("--all", action="store_true")
    args = parser.parse_args()
    mccs = args.mccs if args.mccs else (ALL_MCCS if args.all else MVP_MCCS)

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)
    print(f"Importing {len(mccs)} MCC file(s) via REST API.\n")

    total = 0
    for mcc in mccs:
        t0 = time.time()
        try:
            lines = download_rows(mcc)
            if not lines:
                continue
            rows = parse_batch(lines)
            loaded = upsert(sb, rows)
            print(f"  → {loaded:,} rows in {time.time()-t0:.1f}s")
            total += loaded
        except Exception as e:
            print(f"  ERROR mcc {mcc}: {e}")

    print(f"\nDone. Total: {total:,} rows")

if __name__ == "__main__":
    main()
