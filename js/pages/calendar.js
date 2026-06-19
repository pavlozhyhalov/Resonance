import { el, clear, fmtClock, todayStr, MONTHS, confirmModal, toast } from "../ui.js?v=20260619080452";
import { go } from "../router.js?v=20260619080452";
import { ICON } from "../icons.js?v=20260619080452";
import { Sessions } from "../store.js?v=20260619080452";

const TYPE_META = {
  frequency:{ label:"Частоти", cls:"d-freq", glyph:"◎" },
  wimhof:{ label:"Дихання", cls:"d-breath", glyph:"❂" },
  cold:{ label:"Холод", cls:"d-cold", glyph:"❄" },
  meditation:{ label:"Медитація", cls:"d-breath", glyph:"❂" },
};

export async function render(root){
  let view = new Date(); view.setDate(1);
  let sessions = [];

  const head = el("header",{class:"page-head"},
    el("div",{class:"row between"},
      el("div",{},
        el("h1",{class:"page-title", text:"Календар"}),
        el("p",{class:"page-sub", text:"Кожна практика лишає слід."})
      ),
      el("button",{class:"analyze-btn", onclick:()=>go("analytics")}, ICON.chart(), el("span",{text:"Аналіз"}))
    )
  );
  const monthBar = el("div",{class:"cal-bar"});
  const grid = el("div",{class:"cal-grid"});
  const detail = el("div",{class:"cal-detail"});
  const legend = el("div",{class:"cal-legend"},
    ...Object.values(TYPE_META).filter((v,i,a)=>a.findIndex(x=>x.cls===v.cls)===i)
      .map(m=> el("span",{class:"legend-chip"}, el("span",{class:`dot ${m.cls}`}), m.label))
  );
  root.append(head, monthBar, weekHeader(), grid, legend, detail);

  async function load(){
    const start = new Date(view.getFullYear(), view.getMonth(), 1);
    const end = new Date(view.getFullYear(), view.getMonth()+1, 1);
    try{
      sessions = await Sessions.list({ from:start.toISOString(), to:end.toISOString(), limit:1000 });
    }catch(e){ sessions = []; detail.innerHTML = `<div class="muted small">Увійди, щоб бачити історію.</div>`; }
    paint();
  }

  function paint(){
    clear(monthBar);
    monthBar.append(
      el("button",{class:"cal-nav", onclick:()=>{ view.setMonth(view.getMonth()-1); load(); }, text:"‹"}),
      el("div",{class:"cal-month", text:`${MONTHS[view.getMonth()]} ${view.getFullYear()}`}),
      el("button",{class:"cal-nav", onclick:()=>{ view.setMonth(view.getMonth()+1); load(); }, text:"›"})
    );

    clear(grid);
    const byDay = {};
    sessions.forEach(s=>{ const k=s.started_at.slice(0,10); (byDay[k]||(byDay[k]=[])).push(s); });

    const firstDow = (new Date(view.getFullYear(), view.getMonth(), 1).getDay()+6)%7; // Mon=0
    const days = new Date(view.getFullYear(), view.getMonth()+1, 0).getDate();
    for(let i=0;i<firstDow;i++) grid.append(el("div",{class:"cal-cell empty"}));
    for(let d=1; d<=days; d++){
      const dateStr = `${view.getFullYear()}-${String(view.getMonth()+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
      const items = byDay[dateStr] || [];
      const types = [...new Set(items.map(x=>x.type))];
      const cell = el("button",{class:"cal-cell"+(dateStr===todayStr()?" today":"")+(items.length?" has":""), onclick:()=>showDay(dateStr, items)},
        el("span",{class:"cal-day", text:String(d)}),
        el("span",{class:"cal-dots"}, ...types.map(t=> el("span",{class:`dot ${(TYPE_META[t]||{}).cls||""}`})))
      );
      grid.append(cell);
    }
    // default detail = today or latest
    const t = todayStr();
    showDay(t, byDay[t] || []);
  }

  function showDay(dateStr, items){
    clear(detail);
    const [y,m,d] = dateStr.split("-");
    detail.append(el("div",{class:"cal-detail-head", text:`${+d} ${MONTHS[+m-1]}`}));
    if(!items.length){ detail.append(el("div",{class:"muted small", text:"Немає активності."})); return; }
    items.sort((a,b)=> a.started_at.localeCompare(b.started_at));
    items.forEach(s=>{
      const meta = TYPE_META[s.type] || { label:s.type, cls:"", glyph:"•" };
      const time = new Date(s.started_at).toLocaleTimeString("uk-UA",{hour:"2-digit",minute:"2-digit"});
      detail.append(
        el("div",{class:"sess-row"},
          el("span",{class:`sess-glyph ${meta.cls}`, text:meta.glyph}),
          el("div",{class:"sess-main"},
            el("div",{class:"sess-title", text:meta.label + sessExtra(s)}),
            el("div",{class:"sess-sub", text:`${time} • ${fmtClock(s.duration_seconds||0)}`})
          ),
          el("button",{class:"sess-del", title:"Видалити", onclick:async()=>{
            if(await confirmModal("Видалити цей запис?")){ try{ await Sessions.remove(s.id); toast("Видалено"); load(); }catch(e){ toast("Помилка","err"); } }
          }, text:"✕"})
        )
      );
    });
  }

  await load();
}

function sessExtra(s){
  const d = s.details||{};
  if(s.type==="frequency" && d.name) return ` · ${d.name}`;
  if(s.type==="wimhof" && d.rounds) return ` · ${d.rounds} р.`;
  if(s.type==="cold" && d.mode) return d.mode==="bath" ? " · ванна" : " · душ";
  return "";
}

function weekHeader(){
  const row = el("div",{class:"cal-week"});
  ["Пн","Вт","Ср","Чт","Пт","Сб","Нд"].forEach(d=> row.append(el("span",{text:d})));
  return row;
}
