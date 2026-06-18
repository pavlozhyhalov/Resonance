import { el, clear, toast, modal } from "../ui.js";
import { FREQUENCIES, EFFECT_LABELS, CAT_LABELS, STATUS_LABELS } from "../data.js";
import { youtubeMusicSearch } from "../audio.js";
import { ICON } from "../icons.js";
import { Sessions } from "../store.js";

export async function render(root){
  const state = { effect:"all", cats:new Set(["binaural","solfeggio","other"]) };

  const effectSel = el("select",{class:"select", onchange:e=>{ state.effect=e.target.value; renderList(); }});
  effectSel.append(el("option",{value:"all", text:"Усі ефекти"}));
  Object.entries(EFFECT_LABELS).forEach(([k,v])=> effectSel.append(el("option",{value:k, text:v})));

  const catChips = el("div",{class:"chip-row"});
  Object.entries(CAT_LABELS).forEach(([k,v])=>{
    const c = el("button",{class:"chip on", onclick:()=>{
      if(state.cats.has(k)) state.cats.delete(k); else state.cats.add(k);
      c.classList.toggle("on"); renderList();
    }, text:v});
    catChips.append(c);
  });

  const filters = el("div",{class:"freq-filters"},
    el("label",{class:"field"}, el("span",{class:"field-label", text:"Ефект"}), effectSel),
    el("div",{class:"field"}, el("span",{class:"field-label", text:"Категорія"}), catChips)
  );

  const list = el("div",{class:"freq-list"});

  root.append(
    el("header",{class:"page-head"},
      el("h1",{class:"page-title", text:"Музика по частотах"}),
      el("p",{class:"page-sub", text:"Тап по треку відкриває його в застосунку YouTube Music. Для бінаурал-ритмів — у навушниках."})
    ),
    filters, list
  );

  function passes(f){
    if(!state.cats.has(f.cat)) return false;
    if(state.effect!=="all" && !f.effects.includes(state.effect)) return false;
    return true;
  }

  function renderList(){
    clear(list);
    const items = FREQUENCIES.filter(passes);
    if(!items.length){ list.append(el("div",{class:"muted small", text:"Нічого не знайдено."})); return; }
    items.forEach(f=>{
      const link = el("a",{class:"freq-main", href:youtubeMusicSearch(f.yt), target:"_blank", rel:"noopener"},
        el("div",{class:"freq-hz", text:f.hzLabel}),
        el("div",{class:"freq-meta"},
          el("div",{class:"freq-name"},
            el("span",{text:f.name}),
            el("span",{class:"yt-tag", text:"YT Music ▶"})
          ),
          el("div",{class:"freq-desc", text:f.desc})
        ),
        el("span",{class:`freq-badge ${f.status}`, text:STATUS_LABELS[f.status]})
      );
      const logBtn = el("button",{class:"freq-log", title:"Відмітити в календарі", onclick:()=>logSheet(f)}, ICON.calendar());
      list.append(el("div",{class:"freq-card"}, link, logBtn));
    });
  }

  renderList();
}

function logSheet(f){
  const pick = (min)=>async()=>{
    try{
      await Sessions.add({ type:"frequency", duration_seconds:min*60, details:{ id:f.id, name:f.name, hz:f.hz, source:"youtube" } });
      toast(`Записано: ${f.name} • ${min} хв`);
    }catch(e){ toast("Не вдалося (увійди)","err"); }
    m.close();
  };
  const body = el("div",{},
    el("h3",{class:"modal-title", text:`Відмітити: ${f.name}`}),
    el("p",{class:"modal-msg", text:"Скільки хвилин ти слухав? (1 хв = 1 бал)"}),
    el("div",{class:"row gap", style:"flex-wrap:wrap"},
      el("button",{class:"btn ghost", onclick:pick(5)}, "5 хв"),
      el("button",{class:"btn ghost", onclick:pick(15)}, "15 хв"),
      el("button",{class:"btn ghost", onclick:pick(30)}, "30 хв"),
      el("button",{class:"btn primary", onclick:()=>{ const v=parseInt(prompt("Хвилин?","20"),10); if(v>0) pick(v)(); }}, "Інше")
    )
  );
  const m = modal(body);
}
