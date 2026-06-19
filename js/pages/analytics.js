import { el, clear, fmtClock, todayStr, spinner } from "../ui.js?v=20260619085346";
import { go } from "../router.js?v=20260619085346";
import { Sessions } from "../store.js?v=20260619085346";

const TYPE_LABEL = { frequency:"Частоти", wimhof:"Дихання", cold:"Холод", meditation:"Практики" };
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
  controls.append(
    chips("Метрика", [["minutes","Хвилини"],["count","Сесії"],["retention","Затримки"]], state.metric, v=>{ state.metric=v; paint(); }),
    chips("Період", [[7,"7 днів"],[30,"30 днів"],[90,"90 днів"],["all","Увесь час"]], state.days, v=>{ state.days=v; load(); }),
    chips("Практика", [["all","Усі"],["frequency","Частоти"],["wimhof","Дихання"],["cold","Холод"],["meditation","Інші"]], state.type, v=>{ state.type=v; paint(); })
  );

  const summary = el("div",{class:"an-summary"});
  const chartWrap = el("div",{class:"an-chart"}, spinner());
  const byType = el("div",{class:"an-bytype"});
  root.append(head, controls, summary, chartWrap, byType);

  async function load(){
    chartWrap.replaceChildren(spinner());
    let opts = { limit:5000 };
    if(state.days!=="all"){ const from=new Date(); from.setDate(from.getDate()-(state.days-1)); from.setHours(0,0,0,0); opts.from=from.toISOString(); }
    try{ sessions = await Sessions.list(opts); }
    catch(e){ sessions=[]; chartWrap.replaceChildren(el("div",{class:"muted small", text:"Увійди, щоб бачити аналітику."})); return; }
    paint();
  }

  function rangeStart(today){
    if(state.days==="all"){
      let earliest=new Date(today);
      sessions.forEach(s=>{ const d=new Date(s.started_at); d.setHours(0,0,0,0); if(d<earliest) earliest=d; });
      return earliest;
    }
    const s=new Date(today); s.setDate(today.getDate()-(state.days-1)); return s;
  }

  function buildBuckets(){
    const today=new Date(); today.setHours(0,0,0,0);
    const start=rangeStart(today);
    const spanDays=Math.round((today-start)/86400000)+1;
    const weekly = state.days==="all" && spanDays>92;
    const buckets=[];
    if(weekly){
      let d=new Date(start); const dow=(d.getDay()+6)%7; d.setDate(d.getDate()-dow);
      while(d<=today){ const s=new Date(d), e=new Date(d); e.setDate(e.getDate()+7);
        buckets.push({start:s,end:e,label:`${s.getDate()}.${s.getMonth()+1}`}); d=new Date(e); }
    } else {
      let d=new Date(start);
      while(d<=today){ const s=new Date(d), e=new Date(d); e.setDate(e.getDate()+1);
        buckets.push({start:s,end:e,label:String(s.getDate())}); d=new Date(e); }
    }
    return { buckets, weekly };
  }

  function paint(){
    const filtered = sessions.filter(s=> state.type==="all" || s.type===state.type);
    const { buckets, weekly } = buildBuckets();
    buckets.forEach(b=> b.items=[]);
    filtered.forEach(s=>{
      const d=new Date(s.started_at);
      const b=buckets.find(b=> d>=b.start && d<b.end); if(b) b.items.push(s);
    });

    const values = buckets.map(b=>{
      if(state.metric==="minutes") return Math.round(b.items.reduce((a,s)=>a+(s.duration_seconds||0),0)/60);
      if(state.metric==="count") return b.items.length;
      let best=0; b.items.forEach(s=>{ (s.details&&s.details.retentions||[]).forEach(r=> best=Math.max(best,r)); }); return best;
    });

    const totalMin = Math.round(filtered.reduce((a,s)=>a+(s.duration_seconds||0),0)/60);
    const activeBuckets = buckets.filter(b=>b.items.length).length;
    summary.replaceChildren(
      sCard(totalMin, "хв практики"),
      sCard(filtered.length, "сесій"),
      sCard(activeBuckets, weekly?"активних тижнів":"активних днів"),
    );

    drawChart(buckets.map(b=>b.label), values, state.metric, weekly);

    const typeMin={}; filtered.forEach(s=>{ typeMin[s.type]=(typeMin[s.type]||0)+(s.duration_seconds||0); });
    clear(byType);
    byType.append(el("div",{class:"section-label", text:"Хвилини за практиками"}));
    const maxT=Math.max(1,...Object.values(typeMin));
    Object.keys(TYPE_LABEL).forEach(tp=>{
      const secs=typeMin[tp]||0;
      byType.append(el("div",{class:"bt-row"},
        el("span",{class:"bt-label", text:TYPE_LABEL[tp]}),
        el("div",{class:"bt-track"}, el("div",{class:"bt-fill", style:`width:${(secs/maxT*100).toFixed(1)}%;background:${TYPE_COLOR[tp]}`})),
        el("span",{class:"bt-val", text:Math.round(secs/60)+" хв"})
      ));
    });
  }

  function drawChart(labels, values, metric, weekly){
    const max=Math.max(1,...values), n=values.length;
    const W=Math.max(320,n*16), H=200, pad=24, gap=(W-pad*2)/n, bw=gap*0.62;
    const ns="http://www.w3.org/2000/svg";
    const svg=document.createElementNS(ns,"svg");
    svg.setAttribute("viewBox",`0 0 ${W} ${H}`); svg.setAttribute("class","an-svg");
    [0,0.5,1].forEach(fr=>{
      const y=pad+(H-pad*2)*(1-fr);
      const line=document.createElementNS(ns,"line");
      line.setAttribute("x1",pad);line.setAttribute("x2",W-pad);line.setAttribute("y1",y);line.setAttribute("y2",y);line.setAttribute("class","an-grid");
      svg.append(line);
      const tx=document.createElementNS(ns,"text"); tx.setAttribute("x",2);tx.setAttribute("y",y+3);tx.setAttribute("class","an-ylabel"); tx.textContent=Math.round(max*fr); svg.append(tx);
    });
    values.forEach((v,i)=>{
      const x=pad+gap*i+(gap-bw)/2, h=(H-pad*2)*(v/max), y=pad+(H-pad*2)-h;
      const r=document.createElementNS(ns,"rect");
      r.setAttribute("x",x);r.setAttribute("y",y);r.setAttribute("width",bw);r.setAttribute("height",Math.max(0,h));
      r.setAttribute("rx",Math.min(3,bw/2)); r.setAttribute("class","an-bar"+(v>0?"":" zero")); svg.append(r);
      if(n<=14 || i%Math.ceil(n/10)===0){
        const tx=document.createElementNS(ns,"text"); tx.setAttribute("x",x+bw/2);tx.setAttribute("y",H-6);tx.setAttribute("class","an-xlabel"); tx.textContent=labels[i]; svg.append(tx);
      }
    });
    const unit = metric==="minutes"?(weekly?"хвилини за тиждень":"хвилини за день")
      : metric==="count"?(weekly?"сесії за тиждень":"сесії за день")
      : "найдовша затримка (с)";
    chartWrap.replaceChildren(el("div",{class:"an-chart-title", text:unit}), el("div",{class:"an-scroll"}, svg));
  }

  await load();
}

function chips(label, opts, current, onPick){
  const row=el("div",{class:"an-chip-row"});
  opts.forEach(([val,txt])=>{
    const c=el("button",{class:"an-chip"+(val===current?" on":""), onclick:()=>{
      row.querySelectorAll(".an-chip").forEach(x=>x.classList.remove("on")); c.classList.add("on"); onPick(val);
    }, text:txt});
    row.append(c);
  });
  return el("div",{class:"an-control"}, el("span",{class:"field-label", text:label}), row);
}
function sCard(v,l){ return el("div",{class:"an-scard"}, el("div",{class:"an-snum", text:String(v)}), el("div",{class:"an-slabel", text:l})); }
