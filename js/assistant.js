// ============================================================================
// assistant.js — free in-app helper. Knows the app, gives tips, reads progress.
// No API key, no cost. (Hook left for a live LLM later via aiReply().)
// ============================================================================
import { el, clear, todayStr, fmtClock } from "./ui.js?v=20260619121404";
import { go } from "./router.js?v=20260619121404";
import { sb, Sessions, pointsBalance } from "./store.js?v=20260619121404";

const KB = [
  { k:["почати","з чого","новач","що робити","користув","порадь"], a:
    "Почни з малого й сталого: 1) одна дихальна практика (для старту — Когерентне або Квадратне), 2) 20–30 с прохолодного душу в кінці звичайного, 3) відмічай усе в календарі. 5 хвилин щодня кращі за годину раз на тиждень.",
    act:[["Практики дихання","breathing"],["Холод","cold"]] },
  { k:["вім","хоф","wim"], a:
    "Метод Віма Хофа: ~3 раунди по 30 інтенсивних дихань, далі затримка на видиху скільки комфортно. Дає енергію, стійкість до стресу й холоду. Не роби у воді чи стоячи. Початок — 30 дихань, 1–2 раунди.",
    act:[["Відкрити Вім Хоф","wimhof"]] },
  { k:["квадрат","box","4-4-4-4","коробк"], a:
    "Квадратне дихання 4-4-4-4 (вдих-затримка-видих-затримка). Швидко заспокоює й повертає контроль. Ідеально перед співбесідою, складною розмовою чи коли нервуєш.",
    act:[["Відкрити","pattern?type=box"]] },
  { k:["4-7-8","478","засин","заснути"], a:
    "Дихання 4-7-8 (вдих 4 · затримка 7 · видих 8) — найкраще для сну й тривоги: довгий видих вмикає режим спокою. Зроби 4–6 циклів у ліжку.",
    act:[["Відкрити","pattern?type=r478"]] },
  { k:["когерент","hrv","баланс","5.5"], a:
    "Когерентне дихання ~5.5 с вдих і видих максимізує HRV — показник стресостійкості. Гарна щоденна 5-хвилинна база.",
    act:[["Відкрити","pattern?type=coherent"]] },
  { k:["холод","душ","ванн","криг","cold","моржув"], a:
    "Холод: почни з 15–30 с прохолодного душу в кінці звичайного, дихай повільно й рівно. Дає бадьорість і дофамін надовго, гартує судини. Поступово знижуй температуру. Виходь, якщо німіють кінцівки.",
    act:[["Відкрити холод","cold"]] },
  { k:["бінаур","binaural","навушник"], a:
    "Бінаурал-ритми: у вуха йдуть трохи різні частоти, мозок чує «биття» їхньої різниці. Це єдина категорія тут із попередньою науковою базою. Слухай лише в навушниках.",
    act:[["Частоти","frequencies"]] },
  { k:["solfeggio","сольфе","герц","гц","528","432","174","963","частот"], a:
    "Solfeggio-тони (174–963 Гц) — традиція, а не доведена наука: прямого фізіологічного ефекту немає. Але приємна музика й усвідомлене слухання реально розслабляють. Обирай те, від чого тобі спокійно.",
    act:[["Частоти","frequencies"]] },
  { k:["сон","спати","безсон","висп"], a:
    "Для сну: дихання 4-7-8 у ліжку + дельта/тета-хвилі або 174 Гц фоном. Уникай яскравого світла та бета-хвиль перед сном.",
    act:[["4-7-8","pattern?type=r478"]] },
  { k:["фокус","концентр","робот","продуктив","навчанн"], a:
    "Для фокусу: бета- або гамма-хвилі (40 Гц) у навушниках + квадратне дихання перед стартом. Холодний душ зранку теж добре заряджає.",
    act:[["Квадратне","pattern?type=box"],["Частоти","frequencies"]] },
  { k:["стрес","тривог","нерв","заспок","паніка","хвилю"], a:
    "У моменті стресу — квадратне дихання 4-4-4-4 кілька циклів, найшвидше повертає контроль. Для щоденної стійкості — когерентне дихання.",
    act:[["Квадратне","pattern?type=box"]] },
  { k:["енерг","бадьор","втом","сил","прокинут"], a:
    "Для енергії: метод Віма Хофа вранці + холодний душ. Підіймає дофамін і бадьорість надовго.",
    act:[["Вім Хоф","wimhof"]] },
  { k:["бал","винагород","ціл","очк","нагород"], a:
    "Бали: 1 хвилина практики = 1 бал, плюс бали за завдання. Витрачай їх на винагороди, які сам собі придумаєш — так корисні звички стають приємнішими.",
    act:[["Цілі","tasks"]] },
];

const SUGGESTIONS = ["З чого почати?","Практика для сну","Що таке бінаурал?","Мій прогрес","Практика від стресу"];

function findAnswer(q){
  const s=q.toLowerCase();
  let best=null, score=0;
  for(const e of KB){
    const sc=e.k.reduce((a,k)=> a+(s.includes(k)?1:0),0);
    if(sc>score){ score=sc; best=e; }
  }
  if(best) return { text:best.a, act:best.act };
  return null;
}

async function progressAnswer(){
  try{
    const since=new Date(); since.setDate(since.getDate()-60);
    const [sessions, pts] = await Promise.all([ Sessions.list({from:since.toISOString()}), pointsBalance() ]);
    if(!sessions.length) return { text:"Поки що немає записів. Зроби першу практику — і я почну відстежувати твій прогрес!", act:[["Практики","breathing"]] };
    const days=new Set(sessions.map(s=>s.started_at.slice(0,10)));
    let streak=0, d=new Date(); if(!days.has(todayStr(d))) d.setDate(d.getDate()-1);
    while(days.has(todayStr(d))){ streak++; d.setDate(d.getDate()-1); }
    const totalMin=Math.round(sessions.reduce((a,s)=>a+(s.duration_seconds||0),0)/60);
    let bestHold=0; sessions.forEach(s=>(s.details&&s.details.retentions||[]).forEach(r=>bestHold=Math.max(bestHold,r)));
    const parts=[`Серія: ${streak} дн.`, `сесій за 60 дн.: ${sessions.length}`, `всього ${totalMin} хв`, `балів: ${pts.balance}`];
    if(bestHold) parts.push(`найдовша затримка: ${bestHold} с`);
    let tip = streak===0 ? "Сьогодні ще не практикував — навіть 3 хвилини відновлять серію." :
              streak<3 ? "Гарний початок! Кілька днів поспіль — і звичка закріпиться." :
              "Чудова сталість! Так тримати.";
    return { text: parts.join(" · ") + ". " + tip, act:[["Аналіз","analytics"]] };
  }catch(e){ return { text:"Не вдалося прочитати прогрес — можливо, треба увійти.", act:null }; }
}

async function reply(q){
  const s=q.toLowerCase();
  if(/прогрес|успіх|статист|скільки|динамік|серія|результат/.test(s)) return await progressAnswer();
  const found=findAnswer(q);
  if(found) return found;
  return { text:"Я підкажу по практиках, частотах, холоду й твоєму прогресу. Спитай, наприклад: «з чого почати?», «яка практика для сну?», «що таке бінаурал?» або «мій прогрес».", act:null };
}

async function greeting(){
  const p = await progressAnswer();
  return "Привіт! Я твій помічник Resonance. " + p.text;
}

// --- live AI (Gemini via Supabase Edge Function) with graceful fallback ---
async function buildContext(){
  try{
    const since=new Date(); since.setDate(since.getDate()-60);
    const [sessions,pts]=await Promise.all([Sessions.list({from:since.toISOString()}), pointsBalance()]);
    const days=new Set(sessions.map(s=>s.started_at.slice(0,10)));
    let streak=0,d=new Date(); if(!days.has(todayStr(d))) d.setDate(d.getDate()-1);
    while(days.has(todayStr(d))){ streak++; d.setDate(d.getDate()-1); }
    const totalMin=Math.round(sessions.reduce((a,s)=>a+(s.duration_seconds||0),0)/60);
    let best=0; sessions.forEach(s=>(s.details&&s.details.retentions||[]).forEach(r=>best=Math.max(best,r)));
    const byType={}; sessions.forEach(s=>{ byType[s.type]=(byType[s.type]||0)+1; });
    return `серія ${streak} дн; сесій за 60 дн ${sessions.length}; всього ${totalMin} хв; балів ${pts.balance}; найдовша затримка ${best} с; за типами ${JSON.stringify(byType)}`;
  }catch(e){ return ""; }
}

async function aiReply(message, history, context){
  try{
    const { data, error } = await sb.functions.invoke("assistant", { body:{ message, history, context } });
    if(error) return null;                 // network / not reachable → local fallback
    if(!data || data.error || !data.reply) return null; // not configured yet → local fallback
    return data.reply;                     // live Gemini answer
  }catch(e){ return null; }
}

export function buildAssistant(appEl){
  const fab = el("button",{class:"assistant-fab", title:"Помічник"}, el("span",{text:"✦"}));
  const panel = el("div",{class:"assistant-panel"});
  const msgs = el("div",{class:"assistant-msgs"});
  const chips = el("div",{class:"assistant-chips"});
  const input = el("input",{class:"assistant-input", type:"text", placeholder:"Спитай щось…"});
  const sendBtn = el("button",{class:"assistant-send", text:"→"});

  const header = el("div",{class:"assistant-head"},
    el("span",{class:"assistant-title", text:"Помічник"}),
    el("button",{class:"assistant-close", text:"✕", onclick:close})
  );
  panel.append(header, msgs, chips, el("div",{class:"assistant-inputrow"}, input, sendBtn));
  appEl.append(fab, panel);

  let opened=false, greeted=false;
  const hist=[];
  let ctxPromise=null;
  function open(){ opened=true; panel.classList.add("show"); fab.classList.add("hide"); if(!ctxPromise) ctxPromise=buildContext(); if(!greeted){ greeted=true; firstGreet(); } }
  function close(){ opened=false; panel.classList.remove("show"); fab.classList.remove("hide"); }
  fab.onclick = ()=> opened?close():open();

  async function firstGreet(){
    addMsg("…","bot");
    const g = await greeting();
    msgs.lastChild.remove();
    addMsg(g,"bot");
    renderChips(SUGGESTIONS);
  }

  function addMsg(text, who, actions){
    const m=el("div",{class:`amsg ${who}`}, el("div",{class:"amsg-bubble", text}));
    if(actions && actions.length){
      const row=el("div",{class:"amsg-actions"});
      actions.forEach(([label,route])=> row.append(el("button",{class:"amsg-action", onclick:()=>{ close(); go(route); }, text:label})));
      m.append(row);
    }
    msgs.append(m); msgs.scrollTop=msgs.scrollHeight;
    return m;
  }
  function renderChips(list){
    clear(chips);
    list.forEach(q=> chips.append(el("button",{class:"assistant-chip", onclick:()=>ask(q), text:q})));
  }
  async function ask(q){
    if(!q.trim()) return;
    addMsg(q,"user"); hist.push({who:"user",text:q}); input.value="";
    const thinking=addMsg("…","bot");
    let text=null, act=null;
    const ctx = ctxPromise ? await ctxPromise : "";
    text = await aiReply(q, hist.slice(0,-1), ctx);   // live Gemini first
    if(!text){ const r=await reply(q); text=r.text; act=r.act; }  // fallback: local
    thinking.remove();
    addMsg(text,"bot",act);
    hist.push({who:"bot",text});
  }
  sendBtn.onclick=()=>ask(input.value);
  input.addEventListener("keydown",e=>{ if(e.key==="Enter") ask(input.value); });
}
