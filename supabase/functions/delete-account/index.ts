import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Deletes the calling user's account and ALL their data. Every public table
// referencing auth.users(id) is ON DELETE CASCADE, so removing the auth user
// wipes profiles, sessions, habits, goals, books, ratings, reminders, push
// subscriptions, assistant threads, owned communities, etc. in one step.
// The app uses no Supabase Storage, so there are no orphaned files to clean up.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function j(o: unknown, status: number) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function userIdFromJwt(authHeader: string | null): string | null {
  try {
    const tok = (authHeader || "").replace(/^Bearer\s+/i, "").trim();
    const part = tok.split(".")[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const payload = JSON.parse(atob(b64));
    return typeof payload?.sub === "string" ? payload.sub : null;
  } catch (_e) {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    // verify_jwt=true means the gateway already validated the token; we can
    // trust its sub, so a user can only ever delete their own account.
    const uid = userIdFromJwt(req.headers.get("Authorization"));
    if (!uid) return j({ error: "unauthorized" }, 401);

    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !srv) return j({ error: "config" }, 500);

    // PII-free audit record that a deletion occurred (best-effort; never blocks).
    try {
      await fetch(`${url}/rest/v1/account_deletions`, {
        method: "POST",
        headers: { apikey: srv, Authorization: `Bearer ${srv}`, "Content-Type": "application/json", Prefer: "return=minimal" },
        body: JSON.stringify({}),
      });
    } catch (_e) { /* audit is best-effort */ }

    const r = await fetch(`${url}/auth/v1/admin/users/${uid}`, {
      method: "DELETE",
      headers: { apikey: srv, Authorization: `Bearer ${srv}`, "Content-Type": "application/json" },
    });
    if (!r.ok) {
      const detail = await r.text().catch(() => "");
      return j({ error: "delete_failed", detail }, 200);
    }
    return j({ ok: true }, 200);
  } catch (e) {
    return j({ error: String(e) }, 200);
  }
});
