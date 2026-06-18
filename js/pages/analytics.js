import { el, clear, fmtClock, todayStr, spinner } from "../ui.js";
import { go } from "../router.js";
import { Sessions } from "../store.js";

const TYPE_LABEL = { frequency:"Частоти", wimhof:"Дихання", cold:"Холод", meditation:"Медитація" };
const TYPE_COLOR = { frequency:"#E3B873", wimhof:"#5FD0C4", cold:"#7FD4F2", meditation:"#9B7EDE" };

export async function render(root){
  const state = { metric:"minutes", days:30, type:"all" };
  let sessions = [];

  const head = el("header",{class:"page-head"},
    el("div",{class:"row between"},
      el("div",{},
        el("h1",{class:"page-title", text:"Аналіз"}),
        el("p",{class:"page-sub", text:"Твоя динаміка практик."})
      ),
      el("button",{class:"analyze-btn", onclick:()=>go("calendar")}, el("span",{text:"← Календар"}))
    )
  );

  const controls = el("div",{class:"an-controls"});
  const metricChips = chips("Метрика", [
    ["minutes","Хвилини"],["count","Сесії"],["retention","Затримки"]
  ], state.metric, v=>{ state.metric=v; paint(); });
  const rangeChips = chips("Період", [
    [7,"7 днів"],[30,"30 днів"],[90,"90 днів"]
  ], state.days, v=>{ state.days=v; load(); });
  const typeChips = chips("Практика", [
    ["all","Усі"],["frequency","Частоти"],["wimhof","Дихання"],["cold","Холод"]
  ], state.type, v=>{ state.type=v; paint(); });
  controls.append(metricChips, rangeChips, typeChips);

  const summary = el("div",{class:"an-summary"});
  const chartWrap = el("div",{class:"an-chart"}, spinner());
  const byType = el("div",{class:"an-bytype"});

  root.append(head, controls, summary, chartWrap, byType);

  async function load(){
    chartWrap.replaceChildren(spinner());
    const from = new Date(); from.setDate(from.getDate()-(state.days-1)); from.setHours(0,0,0,0);
    try{ sessions = await Sessions.list({ from: from.toISOString(), limit:2000 }); }
    catch(e){ sessions=[]; chartWrap.replaceChildren(el("div",{class:"muted small", text:"Увійди, щоб бачити аналітику."})); return; }
    paint();
  }

  function dayKeys(){
    const keys=[]; const d=new Date(); d.setHours(0,0,0,0);
    for(let i=state.days-1;i>=0;i--){ const x=new Date(d); x.setDate(d.getDate()-i); keys.push(todayStr(x)); }
    return keys;
  }

  function paint(){
    const filtered = sessions.filter(s=> state.type==="all" || s.type===state.type);
    const keys = dayKeys();
    const map = {}; keys.forEach(k=> map[k]=[]);
    filtered.forEach(s=>{ const k=s.started_at.slice(0,10); if(map[k]) map[k].push(s); });

    // series values
    const values = keys.map(k=>{
      const items = map[k];
      if(state.metric==="minutes") return Math.round(items.reduce((a,s)=>a+(s.duration_seconds||0),0)/60);
      if(state.metric==="count") return items.length;
      // retention: best hold that day (from wimhof)
      let best=0; items.forEach(s=>{ (s.details&&s.details.retentions||[]).forEach(r=> best=Math.max(best,r)); });
      return best;
    });

    // summary numbers
    const totalMin = Math.round(filtered.reduce((a,s)=>a+(s.duration_seconds||0),0)/60);
    const totalSess = filtered.length;
    const activeDays = keys.filter(k=>map[k].length).length;
    summary.replaceChildren(
      sCard(totalMin, "хв практики"),
      sCard(totalSess, "сесій"),
      sCard(activeDays, `із ${state.days} днів`),
    );

    drawChart(keys, values, state.metric);

    // by-type breakdown (minutes)
    const typeMin = {};
    filtered.forEach(s=>{ typeMin[s.type]=(typeMin[s.type]||0)+(s.duration_seconds||0); });
    clear(byType);
    byType.append(el("div",{class:"section-label", text:"Хвилини за практиками"}));
    const maxT = Math.max(1, ...Object.values(typeMin));
    Object.keys(TYPE_LABEL).forEach(t=>{
      const secs=typeMin[t]||0; if(secs===0 && t==="meditation") return;
      const min=Math.round(secs/60);
      byType.append(el("div",{class:"bt-row"},
        el("span",{class:"bt-label", text:TYPE_LABEL[t]}),
        el("div",{class:"bt-track"}, el("div",{class:"bt-fill", style:`width:${(secs/maxT*100).toFixed(1)}%;background:${TYPE_COLOR[t]}`})),
        el("span",{class:"bt-val", text:min+" хв"})
      ));
    });
  }

  function drawChart(keys, values, metric){
    const max = Math.max(1, ...values);
    const n = values.length;
    const W = Math.max(320, n*16), H = 200, pad = 24, bw = (W-pad*2)/n*0.62, gap=(W-pad*2)/n;
    const ns="http://www.w3.org/2000/svg";
    const svg=document.createElementNS(ns,"svg");
    svg.setAttribute("viewBox",`0 0 ${W} ${H}`); svg.setAttribute("class","an-svg");
    // grid lines + y labels (0, mid, max)
    [0,0.5,1].forEach(fr=>{
      const y=pad+(H-pad*2)*(1-fr);
      const line=document.createElementNS(ns,"line");
      line.setAttribute("x1",pad);line.setAttribute("x2",W-pad);line.setAttribute("y1",y);line.setAttribute("y2",y);
      line.setAttribute("class","an-grid"); svg.append(line);
      const tx=document.createElementNS(ns,"text");
      tx.setAttribute("x",2);tx.setAttribute("y",y+3);tx.setAttribute("class","an-ylabel");
      tx.textContent=Math.round(max*fr); svg.append(tx);
    });
    values.forEach((v,i)=>{
      const x=pad+gap*i+(gap-bw)/2;
      const h=(H-pad*2)*(v/max);
      const y=pad+(H-pad*2)-h;
      const r=document.createElementNS(ns,"rect");
      r.setAttribute("x",x);r.setAttribute("y",y);r.setAttribute("width",bw);r.setAttribute("height",Math.max(0,h));
      r.setAttribute("rx",Math.min(3,bw/2));
      r.setAttribute("class","an-bar"+(v>0?"":" zero"));
      svg.append(r);
      // sparse x labels
      if(n<=14 || i%Math.ceil(n/10)===0){
        const tx=document.createElementNS(ns,"text");
        tx.setAttribute("x",x+bw/2);tx.setAttribute("y",H-6);tx.setAttribute("class","an-xlabel");
        tx.textContent=(+keys[i].slice(8,10)); svg.append(tx);
      }
    });
    const unit = metric==="minutes"?"хвилини за день" : metric==="count"?"сесії за день" : "найдовша затримка (с) за день";
    chartWrap.replaceChildren(
      el("div",{class:"an-chart-title", text:unit}),
      el("div",{class:"an-scroll"}, svg)
    );
  }

  await load();
}

function chips(label, opts, current, onPick){
  const row = el("div",{class:"an-chip-row"});
  opts.forEach(([val,txt])=>{
    const c = el("button",{class:"an-chip"+(val===current?" on":""), onclick:()=>{
      row.querySelectorAll(".an-chip").forEach(x=>x.classList.remove("on"));
      c.classList.add("on"); onPick(val);
    }, text:txt});
    row.append(c);
  });
  return el("div",{class:"an-control"}, el("span",{class:"field-label", text:label}), row);
}

function sCard(v,l){ return el("div",{class:"an-scard"}, el("div",{class:"an-snum", text:String(v)}), el("div",{class:"an-slabel", text:l})); }
