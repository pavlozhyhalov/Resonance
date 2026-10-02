import "jsr:@supabase/functions-js/edge-runtime.d.ts";

// Personal MCP server for Resonance (claude.ai custom connector, remote MCP over
// Streamable HTTP). Auth is the per-user token in the URL query (?token=...), the
// same ingest_token used by the Health bridge; ?apikey=<publishable> satisfies the
// Supabase functions gateway. All writes go through token-authed SECURITY DEFINER
// RPCs (rs_log_session / rs_mark_habit / rs_add_water / rs_set_rating / rs_status).

const PROTO = "2025-06-18";
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, accept, mcp-session-id, mcp-protocol-version",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const TOOLS = [
  {
    name: "log_practice",
    description: "Log a wellness practice session into Resonance. Use for breathing (Wim Hof / box / 4-7-8), cold exposure, static exercises, antistress/meditation, frequency/binaural music, or reading. Counts toward the user's level and streak.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", description: "One of: breathing, cold, exercise, meditation, frequency, reading" },
        minutes: { type: "number", description: "Duration in minutes" },
        title: { type: "string", description: "Optional short label (e.g. 'Box breathing', 'Ice bath')" },
        started_at: { type: "string", description: "Optional ISO datetime; defaults to now" },
      },
      required: ["type", "minutes"],
    },
  },
  {
    name: "log_workout",
    description: "Log a workout (running, gym, cardio, etc.) into Resonance as an exercise session. Counts toward the user's level and streak.",
    inputSchema: {
      type: "object",
      properties: {
        minutes: { type: "number", description: "Duration in minutes" },
        distance_km: { type: "number", description: "Optional distance in kilometers" },
        kcal: { type: "number", description: "Optional calories burned" },
        name: { type: "string", description: "Optional workout name (e.g. 'Outdoor run')" },
        started_at: { type: "string", description: "Optional ISO datetime; defaults to now" },
      },
      required: ["minutes"],
    },
  },
  {
    name: "mark_habit",
    description: "Mark a habit for a day. For GOOD habits use state 'done'. For BAD habits use 'relapse' (a full relapse / зрив) or 'slip' (a minor slip / оступ, optional slip_count). Use 'clear' to unmark the day. The habit is matched by name (partial match). Call get_status first to see the user's habit names and kinds.",
    inputSchema: {
      type: "object",
      properties: {
        habit: { type: "string", description: "Habit name or part of it (e.g. 'Nicotine', 'Yoga')" },
        state: { type: "string", enum: ["done", "relapse", "slip", "clear"], description: "done=good habit completed; relapse=bad habit broken; slip=minor slip; clear=unmark" },
        slip_count: { type: "number", description: "Only for state 'slip': how many slips (default 1)" },
        day: { type: "string", description: "Optional YYYY-MM-DD; defaults to today" },
      },
      required: ["habit", "state"],
    },
  },
  {
    name: "add_water",
    description: "Add water intake for the day in Resonance. Provide ml directly or glasses (1 glass = 250 ml). Increments the day's total.",
    inputSchema: {
      type: "object",
      properties: {
        ml: { type: "number", description: "Milliliters to add (e.g. 250)" },
        glasses: { type: "number", description: "Glasses to add (1 glass = 250 ml); used if ml is not given" },
        day: { type: "string", description: "Optional YYYY-MM-DD; defaults to today" },
      },
    },
  },
  {
    name: "set_day_rating",
    description: "Set the user's day rating in Resonance. Scores are 0-100 for morning / noon / evening (any subset). Optional note is stored as the evening note.",
    inputSchema: {
      type: "object",
      properties: {
        morning: { type: "number", description: "Morning score 0-100" },
        noon: { type: "number", description: "Noon score 0-100" },
        evening: { type: "number", description: "Evening score 0-100" },
        note: { type: "string", description: "Optional note about the day" },
        day: { type: "string", description: "Optional YYYY-MM-DD; defaults to today" },
      },
    },
  },
  {
    name: "get_status",
    description: "Read the user's current Resonance status: level, days to next level, total active days, current and longest streak, and what has already been logged today (practices, water, habit marks) plus the list of habits with their kind. Call this before logging to avoid duplicates and to learn habit names.",
    inputSchema: { type: "object", properties: {} },
  },
];

function num(v: unknown): number | null { const n = Number(v); return (v == null || isNaN(n)) ? null : n; }

async function rpc(url: string, srv: string, fn: string, args: Record<string, unknown>) {
  const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: srv, Authorization: `Bearer ${srv}`, "Content-Type": "application/json" },
    body: JSON.stringify(args),
  });
  const out = await r.json().catch(() => null);
  if (!r.ok) return { error: "rpc_failed", detail: out };
  return out;
}

async function callTool(url: string, srv: string, token: string, name: string, a: Record<string, any>) {
  const startedAt = a.started_at ? String(a.started_at) : null;
  const day = a.day ? String(a.day) : null;
  switch (name) {
    case "log_practice": {
      const mins = num(a.minutes) || 0;
      const details: Record<string, unknown> = {};
      if (a.title) details.title = String(a.title).slice(0, 120);
      return await rpc(url, srv, "rs_log_session", { p_token: token, p_type: String(a.type || ""), p_duration_sec: Math.round(mins * 60), p_details: details, p_started_at: startedAt });
    }
    case "log_workout": {
      const mins = num(a.minutes) || 0;
      const details: Record<string, unknown> = { group: "cardio" };
      if (a.name) details.title = String(a.name).slice(0, 120);
      if (num(a.distance_km) != null) details.distance_km = +Number(a.distance_km).toFixed(2);
      if (num(a.kcal) != null) details.kcal = Math.round(Number(a.kcal));
      return await rpc(url, srv, "rs_log_session", { p_token: token, p_type: "exercise", p_duration_sec: Math.round(mins * 60), p_details: details, p_started_at: startedAt });
    }
    case "mark_habit":
      return await rpc(url, srv, "rs_mark_habit", { p_token: token, p_habit: String(a.habit || ""), p_state: String(a.state || "done"), p_day: day, p_slip: num(a.slip_count) });
    case "add_water": {
      let ml = num(a.ml);
      if (ml == null && num(a.glasses) != null) ml = Math.round(Number(a.glasses) * 250);
      return await rpc(url, srv, "rs_add_water", { p_token: token, p_ml: Math.round(ml || 0), p_day: day });
    }
    case "set_day_rating":
      return await rpc(url, srv, "rs_set_rating", { p_token: token, p_day: day, p_m: num(a.morning), p_n: num(a.noon), p_e: num(a.evening), p_note: a.note ? String(a.note) : null });
    case "get_status":
      return await rpc(url, srv, "rs_status", { p_token: token });
    default:
      return { error: "unknown_tool", name };
  }
}

function jrpc(id: unknown, result: unknown) { return { jsonrpc: "2.0", id, result }; }
function jerr(id: unknown, code: number, message: string) { return { jsonrpc: "2.0", id, error: { code, message } }; }

async function handle(msg: any, ctx: { url: string; srv: string; token: string }) {
  const { id, method, params } = msg || {};
  if (method === "initialize") {
    return jrpc(id, { protocolVersion: (params && params.protocolVersion) || PROTO, capabilities: { tools: {} }, serverInfo: { name: "Resonance", version: "1.0.0" } });
  }
  if (method === "ping") return jrpc(id, {});
  if (method === "tools/list") return jrpc(id, { tools: TOOLS });
  if (method === "tools/call") {
    const name = params && params.name;
    const args = (params && params.arguments) || {};
    if (!TOOLS.some((t) => t.name === name)) return jerr(id, -32602, `Unknown tool: ${name}`);
    if (!ctx.token) return jrpc(id, { content: [{ type: "text", text: JSON.stringify({ error: "no_token" }) }], isError: true });
    const out: any = await callTool(ctx.url, ctx.srv, ctx.token, name, args);
    const isErr = !!(out && out.error);
    return jrpc(id, { content: [{ type: "text", text: JSON.stringify(out) }], isError: isErr });
  }
  if (typeof method === "string" && method.startsWith("notifications/")) return null; // notification: no response
  return jerr(id, -32601, `Method not found: ${method}`);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method === "GET") return new Response("Method Not Allowed", { status: 405, headers: cors });
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405, headers: cors });

  const url = Deno.env.get("SUPABASE_URL");
  const srv = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !srv) return new Response(JSON.stringify({ jsonrpc: "2.0", id: null, error: { code: -32603, message: "config" } }), { status: 500, headers: { ...cors, "Content-Type": "application/json" } });

  const token = new URL(req.url).searchParams.get("token") || "";
  const ctx = { url, srv, token };

  let body: any;
  try { body = await req.json(); } catch (_e) { return new Response(JSON.stringify(jerr(null, -32700, "Parse error")), { status: 400, headers: { ...cors, "Content-Type": "application/json" } }); }

  const batch = Array.isArray(body);
  const msgs = batch ? body : [body];
  const out: any[] = [];
  for (const m of msgs) {
    const res = await handle(m, ctx);
    if (res) out.push(res);
  }

  // Notifications only -> 202 no body
  if (out.length === 0) return new Response(null, { status: 202, headers: cors });

  const payload = batch ? out : out[0];
  const accept = req.headers.get("accept") || "";
  if (accept.includes("text/event-stream")) {
    const sse = `event: message\ndata: ${JSON.stringify(payload)}\n\n`;
    return new Response(sse, { status: 200, headers: { ...cors, "Content-Type": "text/event-stream", "Cache-Control": "no-cache" } });
  }
  return new Response(JSON.stringify(payload), { status: 200, headers: { ...cors, "Content-Type": "application/json" } });
});
