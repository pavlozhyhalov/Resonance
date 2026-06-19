import { el, clear } from "../ui.js?v=20260619080452";
import { go } from "../router.js?v=20260619080452";
import { FREQUENCIES, EFFECT_LABELS, CAT_LABELS, STATUS_LABELS } from "../data.js?v=20260619080452";

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
      el("p",{class:"page-sub", text:"Обери частоту — на сторінці буде опис, користь і кілька треків у YouTube Music на вибір."})
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
      list.append(
        el("button",{class:"freq-card click", onclick:()=>go("freq?id="+f.id)},
          el("div",{class:"freq-hz", text:f.hzLabel}),
          el("div",{class:"freq-meta"},
            el("div",{class:"freq-name", text:f.name}),
            el("span",{class:`freq-badge ${f.status}`, text:STATUS_LABELS[f.status]})
          ),
          el("span",{class:"freq-more", text:"Детально →"})
        )
      );
    });
  }

  renderList();
}
