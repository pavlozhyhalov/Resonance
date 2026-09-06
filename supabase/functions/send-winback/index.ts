import { createClient } from 'jsr:@supabase/supabase-js@2';

const APP_URL = 'https://youresonance.com';
const FROM = 'Resonance <reminders@youresonance.com>';

function winMsg(lang: string): string {
  const T: Record<string, { title: string; body: string }> = {
    uk: { title: 'Ми поруч 🌿', body: 'Ти давно не заглядав. Одна коротка практика — і ти знову в потоці.' },
    ru: { title: 'Мы рядом 🌿', body: 'Тебя давно не было. Одна короткая практика — и ты снова в потоке.' },
    en: { title: 'We are here 🌿', body: 'It has been a while. One short practice and you are back in flow.' },
    pl: { title: 'Jesteśmy tu 🌿', body: 'Dawno cię nie było. Jedna krótka praktyka i wracasz do rytmu.' },
  };
  const m = T[lang] || T.uk;
  return JSON.stringify({ title: m.title, body: m.body, url: APP_URL, tag: 'winback' });
}

Deno.serve(async (req: Request) => {
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const sb = createClient(url, key);

    const { data: cfgRows } = await sb.from('app_config').select('key,value')
      .in('key', ['cron_secret', 'resend_api_key', 'vapid_public', 'vapid_private', 'vapid_subject']);
    const cfg: Record<string, string> = {};
    for (const r of (cfgRows || [])) cfg[r.key] = r.value;

    const secret = cfg['cron_secret'];
    if (secret && req.headers.get('x-cron-secret') !== secret) {
      return new Response('forbidden', { status: 403 });
    }

    const resendKey = cfg['resend_api_key'];

    let webpush: any = null;
    if (cfg['vapid_public'] && cfg['vapid_private']) {
      try {
        webpush = (await import('npm:web-push@3.6.7')).default;
        webpush.setVapidDetails(cfg['vapid_subject'] || 'mailto:reminders@youresonance.com', cfg['vapid_public'], cfg['vapid_private']);
      } catch (_e) {
        webpush = null;
      }
    }

    const { data: due, error } = await sb.rpc('winback_candidates');
    if (error) return new Response('rpc error: ' + error.message, { status: 500 });

    let pushed = 0, mailed = 0;
    const failures: string[] = [];

    for (const row of (due || [])) {
      let delivered = false;

      let subs: any[] = [];
      if (webpush) {
        const { data: s } = await sb.from('push_subscriptions').select('endpoint,p256dh,auth,lang').eq('user_id', row.user_id);
        subs = s || [];
      }

      if (subs.length) {
        for (const sub of subs) {
          const payload = winMsg(sub.lang || 'uk');
          try {
            await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
            delivered = true; pushed++;
          } catch (err: any) {
            const code = err?.statusCode;
            if (code === 404 || code === 410) {
              await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            } else {
              failures.push('push:' + row.user_id + ':' + code);
            }
          }
        }
      } else if (resendKey) {
        const html = "<div style='font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#2b211a'>" +
          "<h2 style='margin:0 0 8px;font-weight:600'>Ми поруч 🌿</h2>" +
          "<p style='margin:0 0 18px;line-height:1.5;color:#5a4f45'>Ти давно не заглядав у Resonance. Одна коротка практика — і ти знову в потоці.</p>" +
          "<a href='" + APP_URL + "' style='display:inline-block;background:#5C86C9;color:#fff;text-decoration:none;padding:11px 20px;border-radius:12px;font-weight:600'>Повернутися</a>" +
          "<p style='margin:22px 0 0;font-size:12px;color:#9a8f83'>Нагадування можна вимкнути в налаштуваннях застосунку.</p></div>";
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, to: [row.email], subject: 'Ми поруч — Resonance', html }),
        });
        if (resp.ok) { delivered = true; mailed++; }
        else failures.push('mail:' + row.user_id + ':' + resp.status);
      }

      if (delivered) await sb.rpc('mark_winback_sent', { p_user: row.user_id });
    }

    return new Response(JSON.stringify({ candidates: (due || []).length, pushed, mailed, failures }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('error: ' + (e as Error).message, { status: 500 });
  }
});
