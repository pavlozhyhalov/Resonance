import { createClient } from 'jsr:@supabase/supabase-js@2';

const APP_URL = 'https://youresonance.com';
const FROM = 'Resonance <reminders@youresonance.com>';

function pushMsg(lang: string, streak: number): string {
  const at = streak > 1;
  const T: Record<string, { title: string; body: string }> = {
    uk: at
      ? { title: '🔥 Серія ' + streak + ' днів під загрозою', body: 'Ти сьогодні ще не практикував. Кілька хвилин — і серію збережено.' }
      : { title: 'Час для практики', body: 'Кілька хвилин дихання чи медитації — і день зазвучить інакше.' },
    ru: at
      ? { title: '🔥 Серия ' + streak + ' дней под угрозой', body: 'Ты сегодня ещё не практиковал. Пара минут — и серия сохранена.' }
      : { title: 'Время для практики', body: 'Пара минут дыхания или медитации — и день зазвучит иначе.' },
    en: at
      ? { title: '🔥 Your ' + streak + '-day streak is at risk', body: 'You have not practiced today. A few minutes keeps it alive.' }
      : { title: 'Time to practice', body: 'A few minutes of breathing or meditation change the day.' },
    pl: at
      ? { title: '🔥 Twoja seria ' + streak + ' dni jest zagrożona', body: 'Nie ćwiczyłeś dziś jeszcze. Kilka minut ją ocali.' }
      : { title: 'Czas na praktykę', body: 'Kilka minut oddechu lub medytacji odmieni dzień.' },
  };
  const m = T[lang] || T.uk;
  return JSON.stringify({ title: m.title, body: m.body, url: APP_URL, tag: 'daily-reminder' });
}

// Provider-independent single-push send. Returns the delivery outcome so the
// caller can decide on cleanup / email fallback. (When we migrate web-push → APNs
// for the iOS wrapper, only this function changes.)
async function sendPush(webpush: any, sub: any, payload: string): Promise<{ ok: boolean; gone: boolean; code: number }> {
  try {
    await webpush.sendNotification({ endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } }, payload);
    return { ok: true, gone: false, code: 200 };
  } catch (err: any) {
    const code = err?.statusCode || 0;
    return { ok: false, gone: code === 404 || code === 410, code };
  }
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

    const { data: due, error } = await sb.rpc('due_reminders');
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
        let streak = 0;
        try {
          const { data: ss } = await sb.from('sessions').select('started_at').eq('user_id', row.user_id).order('started_at', { ascending: false }).limit(500);
          const days = new Set((ss || []).map((x: any) => String(x.started_at).slice(0, 10)));
          const ymd = (dt: Date) => dt.toISOString().slice(0, 10);
          const d = new Date();
          if (!days.has(ymd(d))) d.setDate(d.getDate() - 1);
          while (days.has(ymd(d))) { streak++; d.setDate(d.getDate() - 1); }
        } catch (_e) { /* streak best-effort */ }

        for (const sub of subs) {
          const res = await sendPush(webpush, sub, pushMsg(sub.lang || 'uk', streak));
          if (res.ok) {
            delivered = true; pushed++;
            try { await sb.from('push_subscriptions').update({ last_ok_at: new Date().toISOString(), fail_count: 0 }).eq('endpoint', sub.endpoint); } catch (_e) { /* columns optional */ }
          } else if (res.gone) {
            await sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
            failures.push('push_gone:' + row.user_id + ':' + res.code);
          } else {
            try { await sb.rpc('bump_push_fail', { p_endpoint: sub.endpoint }); } catch (_e) { /* fn optional */ }
            failures.push('push:' + row.user_id + ':' + res.code);
          }
        }
      }

      // Email fallback whenever push did NOT deliver — a dead-but-present
      // subscription must never silently swallow the reminder. Only fires when
      // nothing was pushed this run, so no double-notify when push works.
      if (!delivered && resendKey && row.email) {
        const html = "<div style='font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:460px;margin:0 auto;padding:24px;color:#2b211a'>" +
          "<h2 style='margin:0 0 8px;font-weight:600'>Час для практики</h2>" +
          "<p style='margin:0 0 18px;line-height:1.5;color:#5a4f45'>Сьогодні ти ще не відзначив жодної практики. Кілька хвилин дихання чи медитації — і день зазвучить інакше.</p>" +
          "<a href='" + APP_URL + "' style='display:inline-block;background:#5C86C9;color:#fff;text-decoration:none;padding:11px 20px;border-radius:12px;font-weight:600'>Відкрити Resonance</a>" +
          "<p style='margin:22px 0 0;font-size:12px;color:#9a8f83'>Нагадування можна вимкнути в налаштуваннях застосунку.</p></div>";
        const resp = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + resendKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ from: FROM, to: [row.email], subject: 'Час для практики — Resonance', html }),
        });
        if (resp.ok) { delivered = true; mailed++; }
        else failures.push('mail:' + row.user_id + ':' + resp.status + ':' + (await resp.text()).slice(0, 120));
      }

      if (delivered) await sb.rpc('mark_reminder_sent', { p_user: row.user_id });
    }

    return new Response(JSON.stringify({ due: (due || []).length, pushed, mailed, failures }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response('error: ' + (e as Error).message, { status: 500 });
  }
});
