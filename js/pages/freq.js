import { el, toast, modal } from "../ui.js?v=20260619080452";
import { go } from "../router.js?v=20260619080452";
import { FREQUENCIES, CAT_LABELS, STATUS_LABELS } from "../data.js?v=20260619080452";
import { FREQ_CONTENT, freqLinks } from "../content.js?v=20260619080452";
import { Sessions } from "../store.js?v=20260619080452";

export async function render(root, params){
  const f = FREQUENCIES.find(x=>x.id===(params&&params.id));
  if(!f){ root.append(el("div",{class:"error-card", text:"Частоту не знайдено."})); return; }
  const c = FREQ_CONTENT[f.id] || {};
  const links = freqLinks(f.id);

  root.append(
    el("div",{class:"detail-head"},
      el("button",{class:"back-btn", onclick:()=>go("frequencies"), text:"← Частоти"}),
      el("div",{class:"detail-hz", text:f.hzLabel}),
      el("h1",{class:"detail-title", text:f.name}),
      el("div",{class:"detail-tags"},
        el("span",{class:"detail-tag", text:CAT_LABELS[f.cat]}),
        el("span",{class:`freq-badge ${f.status}`, text:STATUS_LABELS[f.status]})
      )
    ),

    el("div",{class:"info-card"},
      c.what ? el("p",{class:"info-lead", text:c.what}) : null,
      c.body ? el("p",{class:"info-text", text:c.body}) : el("p",{class:"info-text", text:f.desc}),
      c.note ? el("div",{class:"info-note"}, el("span",{class:"info-note-ic", text:"ℹ︎"}), el("span",{text:c.note})) : null,
      f.synth && f.synth.kind==="binaural" ? el("div",{class:"info-note headphones"}, el("span",{class:"info-note-ic", text:"🎧"}), el("span",{text:"Бінаурал-ритм — слухай у навушниках, інакше ефекту не буде."}) ) : null
    ),

    el("div",{class:"section-label", text:"Слухати в YouTube Music"}),
    el("div",{class:"link-list"},
      ...links.map(l=> el("a",{class:"yt-link", href:l.url, target:"_blank", rel:"noopener"},
        el("span",{class:"yt-link-label", text:l.label}),
        el("span",{class:"yt-link-go", text:"▶"})
      ))
    ),

    el("button",{class:"add-btn", onclick:()=>logSheet(f), text:"✓ Відмітити прослуховування"})
  );
}

function logSheet(f){
  const pick=(min)=>async()=>{
    try{ await Sessions.add({ type:"frequency", duration_seconds:min*60, details:{ id:f.id, name:f.name, hz:f.hz, source:"youtube" } });
      toast(`Записано: ${f.name} • ${min} хв`);
    }catch(e){ toast("Не вдалося (увійди)","err"); }
    m.close();
  };
  const body = el("div",{},
    el("h3",{class:"modal-title", text:`Відмітити: ${f.name}`}),
    el("p",{class:"modal-msg", text:"Скільки хвилин слухав? (1 хв = 1 бал)"}),
    el("div",{class:"row gap", style:"flex-wrap:wrap"},
      el("button",{class:"btn ghost", onclick:pick(5)}, "5 хв"),
      el("button",{class:"btn ghost", onclick:pick(15)}, "15 хв"),
      el("button",{class:"btn ghost", onclick:pick(30)}, "30 хв"),
      el("button",{class:"btn primary", onclick:()=>{ const v=parseInt(prompt("Хвилин?","20"),10); if(v>0) pick(v)(); }}, "Інше")
    )
  );
  const m = modal(body);
}
