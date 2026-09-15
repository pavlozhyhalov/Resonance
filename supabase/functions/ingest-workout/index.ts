import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Workout bridge for the Apple Shortcuts automation:
// Apple Health (e.g. Nike Run Club) -> Shortcut -> POST here -> sessions row.
// Auth is a per-user personal token (header x-ingest-token or body.token);
// a Shortcut cannot hold a Supabase JWT, so verify_jwt is disabled and the
// SECURITY DEFINER RPC ingest_workout() resolves the token to a user, checks
// entitlement, and inserts an "exercise" session (deduped by external_id).

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-ingest-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function j(o: unknown, status: number) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
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

    const token = String(req.headers.get("x-ingest-token") || body.token || "").trim();
    if (!token) return j({ error: "no_token" }, 401);

    // duration: accept duration_seconds or minutes
    let dur = Number(body.duration_seconds);
    if ((!dur || isNaN(dur)) && body.minutes != null) dur = Math.round(Number(body.minutes) * 60);
    dur = Math.round(dur || 0);

    const started = body.started_at ? new Date(body.started_at) : new Date();
    const startedIso = isNaN(started.getTime()) ? new Date().toISOString() : started.toISOString();

    const details: Record<string, unknown> = { practice: "workout", group: "cardio", source: "health" };
    if (body.name) details.title = String(body.name).slice(0, 120);
    if (body.type_name) details.workout_type = String(body.type_name).slice(0, 60);
    if (body.distance_km != null && !isNaN(Number(body.distance_km))) details.distance_km = +Number(body.distance_km).toFixed(2);
    if (body.kcal != null && !isNaN(Number(body.kcal))) details.kcal = Math.round(Number(body.kcal));

    const ext = String(body.external_id || "").slice(0, 120);

    const r = await fetch(`${url}/rest/v1/rpc/ingest_workout`, {
      method: "POST",
      headers: { apikey: srv, Authorization: `Bearer ${srv}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        p_token: token, p_external_id: ext, p_type: "exercise",
        p_duration: dur, p_started_at: startedIso, p_details: details,
      }),
    });
    const out = await r.json().catch(() => null) as any;
    if (!r.ok) return j({ error: "rpc", detail: out }, 200);
    if (out && out.error) return j(out, out.error === "bad_token" ? 401 : 400);
    return j(out || { ok: true }, 200);
  } catch (e) {
    return j({ error: String(e) }, 200);
  }
});
