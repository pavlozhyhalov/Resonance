import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const MODEL = "gemini-2.5-flash";

// --- Rate limit defaults (overridable via app_config: assistant_hour_limit / assistant_day_limit) ---
const DEFAULT_HOUR_LIMIT = 15;
const DEFAULT_DAY_LIMIT = 40;

const KNOWLEDGE = `Resonance: дихальні практики (Метод Віма Хофа; патерни 4-4-4-4, 4-7-8, когерентне 5.5), холод (душ або крижана ванна), статичні вправи (планка, прогин, вис), антистрес-техніки (заземлення 5-4-3-2-1, прогресивна мʼязова релаксація, аутогенне тренування, сканування тіла), читання, музика по частотах (бінаурал та Solfeggio), календар активності, звички (утримання від шкідливих), цілі з автопрогресом, система розвитку (гілки: Дихальна сила, Загартування, Вправи, Спокій, Знання; Воля як множник за сталість; рівень залежить від найдовшої серії практики; звання щокожні 3 рівні; клас за балансом Тіло/Розум), бали й винагороди.`;

const HOWTO = `Як відповідати:
- Коротко: 1–4 речення. Одразу суть, без вступів і «води».
- Відповідай мовою користувача (за замовчуванням українською). Не вітайся повторно; тримай контекст розмови й відповідай на останнє повідомлення.
- Спирайся на «Дані користувача», якщо вони є: звертайся по імені, згадуй його серію, практики, оцінки, звички й цілі. Будь конкретним щодо саме його ситуації.
- Підтримуй широко: практики, мотивація, зриви звичок, застій, баланс тіла й розуму, цілі, сон, стрес, продуктивність. Даси один зрозумілий наступний крок.
- Не вигадуй цифр і функцій, яких немає.`;

const ACTIONS = `Дії-кнопки: якщо доречна сторінка застосунку, додай у САМОМУ КІНЦІ повідомлення теги дій, кожен з нового рядка, ЗАВЖДИ у форматі [[route|Текст кнопки]] — обовʼязково з назвою кнопки після вертикальної риски. Доступні route: breathing (огляд дихання), wimhof (Метод Віма Хофа), cold (холод), exercises (статичні вправи), antistress (антистрес-техніки), frequencies (музика по частотах), books (читання), rozvytok (розвиток), calendar (календар), tasks (цілі), habits (звички). Для патернів дихання давай ТОЧНО такі route з параметром: pattern?type=box (Квадратне 4-4-4-4), pattern?type=r478 (Дихання 4-7-8), pattern?type=coherent (Когерентне 5.5). НІКОЛИ не давай route \"pattern\" без ?type=. Давай 1–3 дії й лише коли вони справді в тему (паніка/тривога → wimhof або pattern?type=coherent і frequencies; стрес чи злість → cold або дихання; не спиться → pattern?type=coherent; апатія → cold чи exercises; зрив звички → habits і коротка практика). Кнопки-написи давай мовою користувача. Не згадуй ці теги в самому тексті відповіді.`;

const SAFETY = `Безпека: затримки дихання й холод НЕ можна практикувати у воді, за кермом, при вагітності чи серйозних проблемах із серцем/тиском. Ти не лікар і не ставиш діагнозів.
Наука чесно: бінаурал-ритми мають лише попередню наукову базу; Solfeggio (174–963 Гц) та 432 Гц — традиція без доказів.`;

// Explicit UI-language directive so replies match the user's selected language
// even for short/ambiguous prompts. Gemini 2.5 Flash is fully multilingual.
const LANG_NAMES: Record<string, string> = {
  uk: "українською", ru: "русском", en: "English", pl: "polską",
  es: "español (Spanish)", fr: "français (French)", de: "Deutsch (German)",
};
function langDirective(lang: string): string {
  const name = LANG_NAMES[lang] || LANG_NAMES.uk;
  return `Мова інтерфейсу користувача: ${lang}. Відповідай мовою: ${name}. Якщо користувач явно пише іншою мовою — відповідай його мовою. Пиши природно й грамотно цільовою мовою (правильні відмінки, рід і типографіка).`;
}

const TONES: Record<string, string> = {
  calm: "Твій тон: теплий, спокійний і впевнений, як досвідчений наставник. Підтримуй мʼяко, без тиску, і дай один конкретний крок.",
  strict: "Твій тон: суворий, вимогливий тренер. Без жалю до відмовок, але з повагою до людини. Коротко й чітко, підштовхуй до дії, не сюсюкай.",
  friend: "Твій тон: друг-мотиватор. Неформально, на «ти», з енергією та легким гумором, доречні емодзі. Щиро радій успіхам і заряджай ентузіазмом.",
  caring: "Твій тон: дуже турботливий і мʼякий. Багато емпатії, тепла й прийняття. Ніколи не тисни, заспокоюй і підбадьорюй.",
  analyst: "Твій тон: спокійний науковий аналітик. Спирайся на дані й докази, будь точним, конкретним і раціональним, без зайвих емоцій.",
};

function buildSystem(persona: any, lang: string): string {
  const rawName = persona && typeof persona.name === "string" ? persona.name.trim().slice(0, 40) : "";
  const tone = (persona && TONES[persona.tone]) ? TONES[persona.tone] : TONES.calm;
  const idName = rawName ? `Тебе звати ${rawName}. ` : "";
  const identity = `${idName}Ти — персональний ШІ-помічник, наставник і підтримка користувача в застосунку Resonance — не балакучий чат, а справжній супутник на його шляху розвитку. Менше слів — більше суті. ${tone}`;
  return `${identity}\n\n${langDirective(lang)}\n\n${KNOWLEDGE}\n\n${HOWTO}\n\n${ACTIONS}\n\n${SAFETY}`;
}

const ALLOWED = new Set(["home","breathing","wimhof","pattern","cold","exercises","antistress","frequencies","books","rozvytok","calendar","tasks","habits","facts","about"]);

const ROUTE_LABEL: Record<string, string> = {
  home: "Головна", breathing: "Дихання", wimhof: "Метод Віма Хофа", cold: "Холод", exercises: "Вправи", antistress: "Антистрес", frequencies: "Частоти", books: "Книги", rozvytok: "Розвиток", calendar: "Календар", tasks: "Цілі", habits: "Звички", facts: "Факти", about: "Про застосунок",
  "pattern?type=box": "Квадратне дихання", "pattern?type=r478": "Дихання 4-7-8", "pattern?type=coherent": "Когерентне дихання",
};

// Graceful, in-tone rate-limit reply (mentor voice, never a system error) in all UI languages.
const LIMIT_MSG: Record<string, string> = {
  uk: "Гарна в нас розмова 🌿 Продовжимо трохи згодом. А зараз — саме час для короткої практики чи паузи. Я буду тут, коли повернешся.",
  ru: "Хороший у нас разговор 🌿 Продолжим чуть позже. А сейчас — самое время для короткой практики или паузы. Я буду здесь, когда вернёшься.",
  en: "Good conversation we're having 🌿 Let's continue a little later. For now, it's a perfect moment for a short practice or a pause. I'll be right here when you're back.",
  pl: "Dobra z nas rozmowa 🌿 Wróćmy do niej trochę później. A teraz to idealny moment na krótką praktykę lub przerwę. Będę tu, gdy wrócisz.",
  es: "Buena conversación la nuestra 🌿 Sigamos un poco más tarde. Ahora es el momento perfecto para una práctica corta o una pausa. Estaré aquí cuando vuelvas.",
  fr: "Belle conversation que la nôtre 🌿 Continuons un peu plus tard. Pour l'instant, c'est le moment idéal pour une courte pratique ou une pause. Je serai là à ton retour.",
  de: "Ein gutes Gespräch, das wir führen 🌿 Setzen wir es etwas später fort. Jetzt ist der perfekte Moment für eine kurze Praxis oder eine Pause. Ich bin hier, wenn du zurückkommst.",
};
function limitMsg(lang: string): string {
  return LIMIT_MSG[lang] || LIMIT_MSG.uk;
}

// Soft, non-aggressive paywall reply shown in-chat when access has lapsed (all UI languages).
const PAYWALL_MSG: Record<string, string> = {
  uk: "Щоб продовжити спілкування з Наставником, потрібен повний доступ. Твій прогрес лишається з тобою — відкрий підписку, коли будеш готовий 🌿",
  ru: "Чтобы продолжить общение с Наставником, нужен полный доступ. Твой прогресс остаётся с тобой — открой подписку, когда будешь готов 🌿",
  en: "To keep chatting with your mentor you need full access. Your progress stays with you — unlock the subscription whenever you're ready 🌿",
  pl: "Aby dalej rozmawiać z Mentorem, potrzebujesz pełnego dostępu. Twój postęp zostaje z Tobą — odblokuj subskrypcję, gdy będziesz gotów 🌿",
  es: "Para seguir hablando con tu mentor necesitas acceso completo. Tu progreso se queda contigo: desbloquea la suscripción cuando quieras 🌿",
  fr: "Pour continuer à parler avec ton mentor, il te faut l'accès complet. Ta progression reste avec toi — débloque l'abonnement quand tu veux 🌿",
  de: "Um weiter mit deinem Mentor zu sprechen, brauchst du Vollzugang. Dein Fortschritt bleibt bei dir — schalte das Abo frei, wenn du bereit bist 🌿",
};
function paywallMsg(lang: string): string {
  return PAYWALL_MSG[lang] || PAYWALL_MSG.uk;
}

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function j(o: unknown, status: number) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "Content-Type": "application/json" } });
}

function parseActions(text: string): { reply: string; actions: [string, string][] } {
  const actions: [string, string][] = [];
  const add = (route: string, label: string) => {
    const full = String(route).toLowerCase().trim();
    const base = full.split("?")[0];
    const l = String(label || "").trim();
    if (ALLOWED.has(base) && l && actions.length < 3 && !actions.some((a) => a[1] === full)) actions.push([l, full]);
  };
  const reply = text
    .replace(/\[\[\s*([a-zA-Z]+(?:\?type=[a-zA-Z0-9_]+)?)\s*\|\s*([^\]|]+?)\s*\]\]/g, (_m, route, label) => { add(route, label); return ""; })
    .replace(/\[\[\s*([a-zA-Z]+(?:\?type=[a-zA-Z0-9_]+)?)\s*\]\]/g, (_m, route) => { const f = String(route).toLowerCase().trim(); add(route, ROUTE_LABEL[f] || ROUTE_LABEL[f.split("?")[0]] || ""); return ""; })
    .replace(/\[\[[^\]]*\]\]/g, "")
    .replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return { reply, actions };
}

type Config = { key: string | null; hourLimit: number; dayLimit: number };

async function getConfig(): Promise<Config> {
  const out: Config = { key: Deno.env.get("GEMINI_API_KEY") || null, hourLimit: DEFAULT_HOUR_LIMIT, dayLimit: DEFAULT_DAY_LIMIT };
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !srv) return out;
    const r = await fetch(`${url}/rest/v1/app_config?key=in.(gemini_api_key,assistant_hour_limit,assistant_day_limit)&select=key,value`, {
      headers: { apikey: srv, Authorization: `Bearer ${srv}` },
    });
    const rows = await r.json();
    if (Array.isArray(rows)) {
      for (const row of rows) {
        if (row.key === "gemini_api_key" && row.value && !out.key) out.key = String(row.value);
        else if (row.key === "assistant_hour_limit") { const n = parseInt(String(row.value), 10); if (n > 0) out.hourLimit = n; }
        else if (row.key === "assistant_day_limit") { const n = parseInt(String(row.value), 10); if (n > 0) out.dayLimit = n; }
      }
    }
  } catch (_e) { /* keep defaults */ }
  return out;
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

// Server-side entitlement check — the authoritative gate for the paid AI chat.
// Mirrors public.is_entitled(): founder = always; trial < 14d; subscribed < until.
// Fail-open on infra/misconfig error: the per-user rate limit + global backstop
// still bound Gemini cost, and we never want to lock out a paying user on a blip.
async function isEntitled(uid: string): Promise<boolean> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !srv) return true;
    const r = await fetch(`${url}/rest/v1/profiles?user_id=eq.${uid}&select=access_type,trial_started_at,access_until`, {
      headers: { apikey: srv, Authorization: `Bearer ${srv}` },
    });
    if (!r.ok) return true;
    const rows = await r.json();
    const p = Array.isArray(rows) ? rows[0] : null;
    if (!p) return true;
    const t = p.access_type;
    if (t === "founder") return true;
    const now = Date.now();
    if (t === "trial" && p.trial_started_at) return now < new Date(p.trial_started_at).getTime() + 14 * 86400000;
    if (t === "subscribed" && p.access_until) return now < new Date(p.access_until).getTime();
    return false;
  } catch (_e) {
    return true;
  }
}

// DB-independent per-isolate backstop. Bounds total Gemini calls per isolate
// even when the per-user counter is unavailable (the fail-open case) or under a
// sudden spike, so 1.1's budget protection never fully disappears. Coarse by
// design: normal traffic is gated by the per-user limits well below this.
const GLOBAL_WINDOW_MS = 60_000;
const GLOBAL_MAX = 90; // chat calls per isolate per minute
let gWindowStart = Date.now();
let gCount = 0;
function globalAllow(): boolean {
  const now = Date.now();
  if (now - gWindowStart >= GLOBAL_WINDOW_MS) { gWindowStart = now; gCount = 0; }
  if (gCount >= GLOBAL_MAX) return false;
  gCount++;
  return true;
}

// Atomically counts + checks the per-user quota.
// "ok" allowed, "blocked" over limit, "error" counter unavailable (fail-open).
async function checkUser(uid: string, hourLimit: number, dayLimit: number): Promise<"ok" | "blocked" | "error"> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !srv) return "error";
    const r = await fetch(`${url}/rest/v1/rpc/bump_assistant_usage`, {
      method: "POST",
      headers: { apikey: srv, Authorization: `Bearer ${srv}`, "Content-Type": "application/json" },
      body: JSON.stringify({ p_user: uid, p_hour_limit: hourLimit, p_day_limit: dayLimit }),
    });
    if (!r.ok) return "error";
    const data = await r.json();
    return data?.allowed === false ? "blocked" : "ok";
  } catch (_e) {
    return "error";
  }
}

// Best-effort durable log of a rate-limiter safety event (fail_open | backstop).
async function logEvent(kind: string): Promise<void> {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !srv) return;
    await fetch(`${url}/rest/v1/assistant_events`, {
      method: "POST",
      headers: { apikey: srv, Authorization: `Bearer ${srv}`, "Content-Type": "application/json", Prefer: "return=minimal" },
      body: JSON.stringify({ kind }),
    });
  } catch (_e) { /* best-effort */ }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const cfg = await getConfig();
    if (!cfg.key) return j({ error: "no_key" }, 200);
    const { message, history = [], context = "", persona = null, lang = "uk", kind = "chat" } = await req.json();
    if (!message) return j({ error: "no_message" }, 400);

    // Rate limit only interactive chat. Daily tip and greeting are cached
    // client-side (≤1/day each), so they are cheap and never blocked.
    if (kind === "chat") {
      const uid = userIdFromJwt(req.headers.get("Authorization"));
      if (uid) {
        // Entitlement is the authoritative paid-feature gate — checked here so it
        // cannot be bypassed from the browser console (real Gemini cost).
        if (!(await isEntitled(uid))) return j({ reply: paywallMsg(String(lang)), actions: [], paywall: true }, 200);
        const stt = await checkUser(uid, cfg.hourLimit, cfg.dayLimit);
        if (stt === "blocked") return j({ reply: limitMsg(String(lang)), actions: [], limited: true }, 200);
        if (stt === "error") { console.error("assistant: per-user usage counter unavailable; falling back to global backstop"); await logEvent("fail_open"); }
      }
      // DB-independent ceiling, always enforced: protects the Gemini budget on
      // fail-open or a spike even if the per-user counter is down.
      if (!globalAllow()) {
        console.error("assistant: global per-isolate backstop tripped");
        await logEvent("backstop");
        return j({ reply: limitMsg(String(lang)), actions: [], limited: true }, 200);
      }
    }

    const contents: any[] = [];
    for (const m of (Array.isArray(history) ? history : []).slice(-10)) {
      contents.push({ role: m.who === "user" ? "user" : "model", parts: [{ text: String(m.text || "") }] });
    }
    contents.push({ role: "user", parts: [{ text: (context ? `Дані користувача: ${context}\n\n` : "") + String(message) }] });

    const body = {
      system_instruction: { parts: [{ text: buildSystem(persona, String(lang)) }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 512, thinkingConfig: { thinkingBudget: 0 } },
    };

    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${cfg.key}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) },
    );
    const data = await r.json();
    const raw = data?.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("").trim();
    if (!raw) return j({ error: "no_reply", detail: data?.error?.message || "empty" }, 200);
    const { reply, actions } = parseActions(raw);
    return j({ reply, actions }, 200);
  } catch (e) {
    return j({ error: String(e) }, 200);
  }
});
