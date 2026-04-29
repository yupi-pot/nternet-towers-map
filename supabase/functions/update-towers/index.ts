/**
 * update-towers Edge Function
 *
 * Downloads one or more OpenCelliD CSV.gz files and upserts the rows
 * into the cell_towers table using batch inserts.
 *
 * Called by pg_cron monthly, or manually:
 *   curl -X POST https://nykisarixoohwxqbxdnz.supabase.co/functions/v1/update-towers \
 *     -H "Authorization: Bearer <service_role_key>" \
 *     -H "Content-Type: application/json" \
 *     -d '{"mccs": [214]}'
 *
 * Body params:
 *   mccs   - array of MCC numbers to import (default: MVP_MCCS)
 *   all    - if true, import all known MCCs (long-running, use with care)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const OCID_TOKEN = Deno.env.get("OCID_TOKEN") ?? "";
const OCID_BASE  = "https://opencellid.org/ocid/downloads";

// MVP default: Spain, France, Germany, UK, Netherlands
const MVP_MCCS = [214, 208, 262, 234, 204];

const BATCH_SIZE = 500; // rows per INSERT

interface TowerRow {
  radio: string;
  mcc: number;
  net: number;
  area: number;
  cell: number;
  unit: number | null;
  lon: number;
  lat: number;
  range: number | null;
  samples: number | null;
  changeable: number | null;
  created_at: string | null;
  updated_at: string | null;
  avg_signal: number | null;
}

async function downloadAndParse(mcc: number): Promise<TowerRow[]> {
  const url = `${OCID_BASE}?token=${OCID_TOKEN}&type=mcc&file=${mcc}.csv.gz`;
  const resp = await fetch(url);

  if (resp.status === 404) return [];
  if (!resp.ok) throw new Error(`HTTP ${resp.status} for MCC ${mcc}`);

  const buf       = await resp.arrayBuffer();
  const ds        = new DecompressionStream("gzip");
  const writer    = ds.writable.getWriter();
  const reader    = ds.readable.getReader();
  writer.write(new Uint8Array(buf));
  writer.close();

  const chunks: Uint8Array[] = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const text = new TextDecoder().decode(
    chunks.reduce((a, b) => {
      const merged = new Uint8Array(a.length + b.length);
      merged.set(a);
      merged.set(b, a.length);
      return merged;
    }, new Uint8Array(0))
  );

  const lines  = text.split("\n");
  const header = lines[0].split(",");
  const rows: TowerRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols: Record<string, string> = {};
    line.split(",").forEach((v, idx) => { cols[header[idx]] = v; });

    const lon = parseFloat(cols["lon"]);
    const lat = parseFloat(cols["lat"]);
    if (isNaN(lon) || isNaN(lat)) continue;
    if (lon < -180 || lon > 180 || lat < -90 || lat > 90) continue;

    const tsOf = (v: string) =>
      v && v !== "0"
        ? new Date(parseInt(v) * 1000).toISOString()
        : null;

    rows.push({
      radio:      cols["radio"] ?? "",
      mcc:        parseInt(cols["mcc"]),
      net:        parseInt(cols["net"]),
      area:       parseInt(cols["area"]),
      cell:       parseInt(cols["cell"]),
      unit:       cols["unit"] ? parseInt(cols["unit"]) : null,
      lon,
      lat,
      range:      cols["range"]         ? parseInt(cols["range"])         : null,
      samples:    cols["samples"]       ? parseInt(cols["samples"])       : null,
      changeable: cols["changeable"]    ? parseInt(cols["changeable"])    : null,
      created_at: tsOf(cols["created"]),
      updated_at: tsOf(cols["updated"]),
      avg_signal: cols["averageSignal"] ? parseInt(cols["averageSignal"]) : null,
    });
  }

  return rows;
}

async function upsertBatch(
  supabase: ReturnType<typeof createClient>,
  rows: TowerRow[]
): Promise<number> {
  let loaded = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const { error, count } = await supabase
      .from("cell_towers")
      .upsert(batch, {
        onConflict: "radio,mcc,net,area,cell",
        count: "exact",
      });
    if (error) throw new Error(error.message);
    loaded += count ?? batch.length;
  }
  return loaded;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  let mccs: number[] = MVP_MCCS;
  try {
    const body = await req.json().catch(() => ({}));
    if (Array.isArray(body.mccs) && body.mccs.length > 0) mccs = body.mccs;
  } catch { /* use default */ }

  const results: Record<number, { loaded: number; status: string }> = {};

  for (const mcc of mccs) {
    const started = new Date().toISOString();
    try {
      console.log(`MCC ${mcc}: downloading…`);
      const rows = await downloadAndParse(mcc);

      if (rows.length === 0) {
        results[mcc] = { loaded: 0, status: "no_data" };
        await supabase.from("import_runs").insert({
          mcc, rows_loaded: 0, started_at: started, status: "no_data",
          file_url: `${OCID_BASE}?token=...&type=mcc&file=${mcc}.csv.gz`,
        });
        continue;
      }

      console.log(`MCC ${mcc}: upserting ${rows.length} rows…`);
      const loaded = await upsertBatch(supabase, rows);
      results[mcc] = { loaded, status: "ok" };

      await supabase.from("import_runs").insert({
        mcc, rows_loaded: loaded, started_at: started,
        finished_at: new Date().toISOString(), status: "ok",
        file_url: `${OCID_BASE}?token=...&type=mcc&file=${mcc}.csv.gz`,
      });

      console.log(`MCC ${mcc}: done (${loaded} rows)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results[mcc] = { loaded: 0, status: `error: ${msg}` };
      await supabase.from("import_runs").insert({
        mcc, rows_loaded: 0, started_at: started,
        finished_at: new Date().toISOString(), status: `error: ${msg}`,
        file_url: `${OCID_BASE}?token=...&type=mcc&file=${mcc}.csv.gz`,
      });
    }
  }

  return Response.json({ results });
});
