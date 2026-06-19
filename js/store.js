import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_KEY } from "./config.js?v=20260619085346";

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
});

// ---------- auth ----------
export const Auth = {
  async session(){ const { data } = await sb.auth.getSession(); return data.session; },
  async user(){ const { data } = await sb.auth.getUser(); return data.user; },
  signUp(email, password){ return sb.auth.signUp({ email, password }); },
  signIn(email, password){ return sb.auth.signInWithPassword({ email, password }); },
  signOut(){ return sb.auth.signOut(); },
  onChange(cb){ return sb.auth.onAuthStateChange((_e, s) => cb(s)); }
};

// ---------- sessions (activity log) ----------
export const Sessions = {
  async add({ type, duration_seconds=null, details={}, started_at=null }){
    const row = { type, duration_seconds, details };
    if(started_at) row.started_at = started_at;
    const { data, error } = await sb.from("sessions").insert(row).select().single();
    if(error) throw error; return data;
  },
  async list({ from=null, to=null, limit=500 }={}){
    let q = sb.from("sessions").select("*").order("started_at", { ascending:false }).limit(limit);
    if(from) q = q.gte("started_at", from);
    if(to)   q = q.lte("started_at", to);
    const { data, error } = await q;
    if(error) throw error; return data || [];
  },
  async remove(id){
    const { error } = await sb.from("sessions").delete().eq("id", id);
    if(error) throw error;
  }
};

// ---------- tasks ----------
export const Tasks = {
  async list(){
    const { data, error } = await sb.from("tasks").select("*")
      .eq("active", true).order("sort_order").order("created_at");
    if(error) throw error; return data || [];
  },
  async add({ title, points=10, cadence="daily" }){
    const { data, error } = await sb.from("tasks").insert({ title, points, cadence }).select().single();
    if(error) throw error; return data;
  },
  async update(id, patch){
    const { data, error } = await sb.from("tasks").update(patch).eq("id", id).select().single();
    if(error) throw error; return data;
  },
  async remove(id){
    const { error } = await sb.from("tasks").update({ active:false }).eq("id", id);
    if(error) throw error;
  },
  async completionsOn(dateStr){
    const { data, error } = await sb.from("task_completions").select("*").eq("done_on", dateStr);
    if(error) throw error; return data || [];
  },
  async complete(task, dateStr){
    const { data, error } = await sb.from("task_completions")
      .insert({ task_id: task.id, done_on: dateStr, points: task.points })
      .select().single();
    if(error) throw error; return data;
  },
  async uncomplete(taskId, dateStr){
    const { error } = await sb.from("task_completions").delete()
      .eq("task_id", taskId).eq("done_on", dateStr);
    if(error) throw error;
  },
  async totalEarned(){
    const { data, error } = await sb.from("task_completions").select("points");
    if(error) throw error;
    return (data||[]).reduce((s,r)=> s + (r.points||0), 0);
  }
};

// ---------- rewards ----------
export const Rewards = {
  async list(){
    const { data, error } = await sb.from("rewards").select("*").order("created_at");
    if(error) throw error; return data || [];
  },
  async add({ title, cost=100 }){
    const { data, error } = await sb.from("rewards").insert({ title, cost }).select().single();
    if(error) throw error; return data;
  },
  async remove(id){
    const { error } = await sb.from("rewards").delete().eq("id", id);
    if(error) throw error;
  },
  async redeem(id){
    const { data, error } = await sb.from("rewards")
      .update({ redeemed_at: new Date().toISOString() }).eq("id", id).select().single();
    if(error) throw error; return data;
  },
  async totalSpent(){
    const { data, error } = await sb.from("rewards").select("cost, redeemed_at");
    if(error) throw error;
    return (data||[]).filter(r=>r.redeemed_at).reduce((s,r)=> s + (r.cost||0), 0);
  }
};

// ---------- practice minutes (1 min = 1 point) ----------
export async function practiceMinutes(){
  const { data, error } = await sb.from("sessions").select("duration_seconds");
  if(error) throw error;
  return (data||[]).reduce((s,r)=> s + Math.floor((r.duration_seconds||0)/60), 0);
}

// ---------- points balance ----------
// balance = task points + practice minutes − redeemed rewards
export async function pointsBalance(){
  const [taskPts, minutes, spent] = await Promise.all([
    Tasks.totalEarned(), practiceMinutes(), Rewards.totalSpent()
  ]);
  const earned = taskPts + minutes;
  return { earned, taskPts, minutes, spent, balance: earned - spent };
}

// ---------- settings (per-user prefs) ----------
export const Settings = {
  async get(){
    const { data, error } = await sb.from("settings").select("data").maybeSingle();
    if(error) throw error;
    return (data && data.data) || {};
  },
  async save(obj){
    const { error } = await sb.from("settings")
      .upsert({ data: obj, updated_at: new Date().toISOString() }, { onConflict:"user_id" });
    if(error) throw error;
  }
};
