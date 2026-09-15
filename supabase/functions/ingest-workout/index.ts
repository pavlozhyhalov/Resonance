import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Workout bridge. Accepts two payload shapes:
//  (A) Health Auto Export REST API: { data: { workouts: [ {..} ] } }
//  (B) flat single workout (Apple Shortcut): { external_id, minutes|duration_seconds, started_at, name, distance_km, kcal }
// Auth: per-user token in header x-ingest-token (or ?token= / body.token) PLUS the
// project's publishable apikey header (required by the functions gateway).
// Inserts each workout as an "exercise" session via the SECURITY DEFINER RPC
// ingest_workout() (token->uid, entitlement check, dedup by external_id).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function j(o: unknown, status: number) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function parseDate(s: unknown): Date {
  if (!s) return new Date();
  let d = new Date(String(s));
  if (!isNaN(d.getTime())) return d;
  d = new Date(String(s).replace(" ", "T"));
  if (!isNaN(d.getTime())) return d;
  d = new Date(String(s).replace(" ", "T").replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  if (!isNaN(d.getTime())) return d;
  return new Date();
}
function unitsOf(v: any): string {
  return (v && typeof v === "object" && v.units) ? String(v.units).toLowerCase() : "";
}
function qty(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number") return v;
  if (typeof v === "object" && v.qty != null) return Number(v.qty);
  const n = Number(v);
  return isNaN(n) ? null : n;
}
function distKm(v: any): number | null {
  const q = qty(v);
  if (q == null) return null;
  const u = unitsOf(v);
  if (u.includes("mi")) return +(q * 1.60934).toFixed(2);
  if (u === "m" || u.includes("meter")) return +(q / 1000).toFixed(2);
  return +q.toFixed(2);
}
function kcalOf(v: any): number | null {
  const q = qty(v);
  if (q == null) return null;
  const u = unitsOf(v);
  if (u.includes("kj")) return q / 4.184;   // kilojoules -> kcal
  return q;                                  // kcal / Cal
}

async function rpc(url: string, srv: string, args: Record<string, unknown>) {
  const r = await fetch(`${url}/rest/v1/rpc/ingest_workout`, {
    method: "POST",
    headers: { apikey: srv, Authorization: `Bearer ${srv}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const out = await r.json().catch(() => null);
  return { ok: r.ok, out };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return j({ error: "method" }, 405);
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !srv) return j({ error: "config" }, 500);

    let body: any = {};
    try { body = await req.json(); } catch (_e) { body = {}; }

    const qp = new URL(req.url).searchParams.get("token") || "";
    const token = String(req.headers.get("x-ingest-token") || body.token || qp || "").trim();
    if (!token) return j({ error: "no_token" }, 401);

    // Collect workouts (Health Auto Export shape, or arrays)
    let workouts: any[] = [];
    if (body && body.data && Array.isArray(body.data.workouts)) workouts = body.data.workouts;
    else if (Array.isArray(body.workouts)) workouts = body.workouts;
    else if (Array.isArray(body)) workouts = body;

    if (workouts.length) {
      const results: any[] = [];
      for (const w of workouts) {
        const start = parseDate(w.start || w.startDate || w.started_at);
        let dur = qty(w.duration ?? w.duration_seconds);
        if ((dur == null || dur === 0) && (w.end || w.endDate)) {
          dur = (parseDate(w.end || w.endDate).getTime() - start.getTime()) / 1000;
        }
        dur = Math.round(dur || 0);
        const details: Record<string, unknown> = { practice: "workout", group: "cardio", source: "health" };
        if (w.name) details.title = String(w.name).slice(0, 120);
        const dk = distKm(w.distance ?? w.totalDistance ?? w.distanceKm);
        if (dk != null) details.distance_km = dk;
        const kc = kcalOf(w.activeEnergyBurned ?? w.activeEnergy ?? w.totalEnergyBurned ?? w.kcal);
        if (kc != null) details.kcal = Math.round(kc);
        const ext = String(w.id || w.uuid || start.toISOString()).slice(0, 120);
        const res = await rpc(url, srv, { p_token: token, p_external_id: ext, p_type: "exercise", p_duration: dur, p_started_at: start.toISOString(), p_details: details });
        results.push(res.out);
      }
      const bad = results.find((x) => x && x.error);
      if (bad) return j({ ok: false, count: workouts.length, results }, bad.error === "bad_token" ? 401 : 200);
      return j({ ok: true, count: workouts.length, results }, 200);
    }

    // Flat single workout (Shortcut)
    let dur = Number(body.duration_seconds);
    if ((!dur || isNaN(dur)) && body.minutes != null) dur = Math.round(Number(body.minutes) * 60);
    dur = Math.round(dur || 0);
    const start = parseDate(body.started_at);
    const details: Record<string, unknown> = { practice: "workout", group: "cardio", source: "health" };
    if (body.name) details.title = String(body.name).slice(0, 120);
    if (body.type_name) details.workout_type = String(body.type_name).slice(0, 60);
    const dk = distKm(body.distance_km);
    if (dk != null) details.distance_km = dk;
    const kc = kcalOf(body.kcal);
    if (kc != null) details.kcal = Math.round(kc);
    const ext = String(body.external_id || start.toISOString()).slice(0, 120);
    const res = await rpc(url, srv, { p_token: token, p_external_id: ext, p_type: "exercise", p_duration: dur, p_started_at: start.toISOString(), p_details: details });
    if (res.out && res.out.error) return j(res.out, res.out.error === "bad_token" ? 401 : 400);
    return j(res.out || { ok: true }, 200);
  } catch (e) {
    return j({ error: String(e) }, 200);
  }
});
