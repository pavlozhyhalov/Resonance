import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Sends a test push to the CALLER's own subscriptions. Powers the "Send test"
// button in Settings → Reminders → Technical state, so the owner can verify
// push on a real device (the build environment has no network / can't test).
// verify_jwt=true → a user can only ever test their own subscriptions.

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function j(o: unknown, status: number) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}
function userIdFromJwt(h: string | null): string | null {
  try {
    const tok = (h || "").replace(/^Bearer\s+/i, "").trim();
    const part = tok.split(".")[1];
    if (!part) return null;
    let b64 = part.replace(/-/g, "+").replace(/_/g, "/");
    while (b64.length % 4) b64 += "=";
    const p = JSON.parse(atob(b64));
    return typeof p?.sub === "string" ? p.sub : null;
  } catch (_e) { return null; }
}
const TEST_BODY: Record<string, string> = {
  uk: "Тестове сповіщення 🌿 Push працює.",
  ru: "Тестовое уведомление 🌿 Push работает.",
  en: "Test notification 🌿 Push works.",
  pl: "Powiadomienie testowe 🌿 Push działa.",
  es: "Notificación de prueba 🌿 El push funciona.",
  fr: "Notification test 🌿 Le push fonctionne.",
  de: "Testbenachrichtigung 🌿 Push funktioniert.",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const uid = userIdFromJwt(req.headers.get("Authorization"));
    if (!uid) return j({ error: "unauthorized" }, 401);
    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !srv) return j({ error: "config" }, 500);

    let lang = "uk";
    try { const b = await req.json(); if (b && typeof b.lang === "string") lang = b.lang; } catch (_e) { /* body optional */ }

    const cr = await fetch(`${url}/rest/v1/app_config?key=in.(vapid_public,vapid_private,vapid_subject)&select=key,value`, {
      headers: { apikey: srv, Authorization: `Bearer ${srv}` },
    });
    const rows = await cr.json();
    const cfg: Record<string, string> = {};
    if (Array.isArray(rows)) for (const r of rows) cfg[r.key] = r.value;
    if (!cfg.vapid_public || !cfg.vapid_private) return j({ error: "no_vapid" }, 200);

    let webpush: any;
    try {
      webpush = (await import("npm:web-push@3.6.7")).default;
      webpush.setVapidDetails(cfg.vapid_subject || "mailto:reminders@youresonance.com", cfg.vapid_public, cfg.vapid_private);
    } catch (_e) { return j({ error: "webpush_init" }, 200); }

    const sr = await fetch(`${url}/rest/v1/push_subscriptions?user_id=eq.${uid}&select=endpoint,p256dh,auth`, {
      headers: { apikey: srv, Authorization: `Bearer ${srv}` },
    });
    const subs = await sr.json();
    if (!Array.isArray(subs) || !subs.length) return j({ ok: true, subs: 0, sent: 0, failed: 0, note: "no_subscription" }, 200);

    const payload = JSON.stringify({ title: "Resonance", body: TEST_BODY[lang] || TEST_BODY.uk, url: "https://youresonance.com", tag: "test-push" });
    let sent = 0, failed = 0;
    for (const sub of subs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
        sent++;
        await fetch(`${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, {
          method: "PATCH",
          headers: { apikey: srv, Authorization: `Bearer ${srv}`, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ last_ok_at: new Date().toISOString(), fail_count: 0 }),
        });
      } catch (err: any) {
        failed++;
        const code = err?.statusCode || 0;
        if (code === 404 || code === 410) {
          await fetch(`${url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(sub.endpoint)}`, {
            method: "DELETE", headers: { apikey: srv, Authorization: `Bearer ${srv}` },
          });
        }
      }
    }
    return j({ ok: true, subs: subs.length, sent, failed }, 200);
  } catch (e) {
    return j({ error: String(e) }, 200);
  }
});
