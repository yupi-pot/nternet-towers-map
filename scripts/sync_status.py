#!/usr/bin/env python3
"""
Syncs mcc_status.json with actual tower counts from Supabase.
Run any time to see what's done / pending / failed.
"""
import json, os
from supabase import create_client
from datetime import datetime

SUPABASE_URL = "https://nykisarixoohwxqbxdnz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55a2lzYXJpeG9vaHd4cWJ4ZG56Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0NjQyNzksImV4cCI6MjA5MzA0MDI3OX0.YN5vRzHACGAP5l_lTO5ezxrXAEIn65F6YOBp42BYgTo"
STATUS_FILE  = os.path.join(os.path.dirname(__file__), "mcc_status.json")

def main():
    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    counts = {
        str(r["mcc"]): r["count"]
        for r in sb.rpc("count_towers_by_mcc", {}).execute().data
    }

    status = json.load(open(STATUS_FILE))
    today  = datetime.now().date().isoformat()

    for k, count in counts.items():
        if k in status:
            status[k]["status"] = "done"
            status[k]["rows"]   = count
            status[k]["date"]   = today

    json.dump(status, open(STATUS_FILE, "w"), indent=2)

    done    = [k for k, v in status.items() if v["status"] == "done"]
    pending = [k for k, v in status.items() if v["status"] == "pending"]
    errors  = [k for k, v in status.items() if v["status"] == "error"]
    no_data = [k for k, v in status.items() if v["status"] == "no_data"]
    total   = sum(v.get("rows", 0) for v in status.values())

    print(f"\n{'─'*52}")
    print(f"  Done     : {len(done):>4}  MCCs  ({total:,} towers total)")
    print(f"  Pending  : {len(pending):>4}  MCCs")
    print(f"  No data  : {len(no_data):>4}  MCCs")
    print(f"  Errors   : {len(errors):>4}  MCCs")
    print(f"{'─'*52}")
    if errors:
        print(f"\n  Errors: {', '.join(errors)}")
    if pending:
        sample = ', '.join(
            f"{k}({status[k].get('country','')})" for k in list(pending)[:10]
        )
        print(f"\n  Next pending: {sample}{'…' if len(pending) > 10 else ''}")
    print()

if __name__ == "__main__":
    main()
