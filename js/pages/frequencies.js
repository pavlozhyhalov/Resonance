import { el, clear, fmtTime, toast } from "../ui.js";
import { FREQUENCIES, EFFECT_LABELS, CAT_LABELS, STATUS_LABELS } from "../data.js";
import { Main, youtubeSearchEmbed, stopAll } from "../audio.js";
import { ICON } from "../icons.js";
import { Sessions } from "../store.js";

export async function render(root){
  const state = { effect:"all", cats:new Set(["binaural","solfeggio","other"]), source:"audio", vol:0.6 };
  let player = null;

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
  const sheet = el("div",{class:"player-sheet", id:"player-sheet"});

  root.append(
    el("header",{class:"page-head"},
      el("h1",{class:"page-title", text:"Музика по частотах"}),
      el("p",{class:"page-sub", text:"Аудіо грає всередині застосунку. Для бінаурал-ритмів потрібні навушники."})
    ),
    filters, list, sheet
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
        el("button",{class:"freq-card", onclick:()=>openPlayer(f)},
          el("div",{class:"freq-hz", text:f.hzLabel}),
          el("div",{class:"freq-meta"},
            el("div",{class:"freq-name", text:f.name}),
            el("div",{class:"freq-desc", text:f.desc})
          ),
          el("span",{class:`freq-badge ${f.status}`, text:STATUS_LABELS[f.status]})
        )
      );
    });
  }

  function openPlayer(f){
    if(player) player.dispose();
    stopAll();
    player = buildPlayer(f, state, sheet, ()=>{ player=null; });
    player.open();
  }

  renderList();
  return () => { if(player) player.dispose(); };
}

function buildPlayer(f, state, sheet, onClose){
  let playing = false, startedAt = null, tick = null, source = state.source;

  const viz = el("div",{class:"viz"},
    el("span",{class:"viz-ring r1"}), el("span",{class:"viz-ring r2"}), el("span",{class:"viz-ring r3"}),
    el("span",{class:"viz-core", text:f.hzLabel})
  );
  const period = Math.max(0.8, Math.min(3.4, 60 / Math.max(f.hz, 2)));
  viz.style.setProperty("--pulse", period.toFixed(2)+"s");

  const timeLbl = el("div",{class:"player-time", text:"0:00"});
  const segAudio = el("button",{class:"seg "+(source==="audio"?"on":""), text:"Аудіо"});
  const segYt = el("button",{class:"seg "+(source==="yt"?"on":""), text:"YouTube"});
  const seg = el("div",{class:"seg-group"}, segAudio, segYt);
  const ytWrap = el("div",{class:"yt-wrap", style:"display:none"});

  const playBtn = el("button",{class:"play-btn", onclick:toggle}, ICON.play());
  const vol = el("input",{type:"range", min:"0", max:"100", value:String(Math.round(state.vol*100)), class:"vol",
    oninput:e=>{ state.vol=e.target.value/100; Main.setVolume(state.vol); }});
  const volRow = el("div",{class:"vol-row"}, el("span",{class:"vol-ic", text:"🔊"}), vol);

  const hint = f.synth && f.synth.kind==="binaural"
    ? el("div",{class:"player-hint", text:"🎧 Бінаурал-ритм — слухай у навушниках"})
    : null;

  const closeBtn = el("button",{class:"sheet-close", onclick:close}, ICON.close());

  const body = el("div",{class:"player-body"},
    closeBtn,
    el("div",{class:"player-titlewrap"},
      el("div",{class:"player-name", text:f.name}),
      el("div",{class:"player-cat", text:CAT_LABELS[f.cat]})
    ),
    seg, viz, ytWrap, timeLbl,
    el("div",{class:"player-controls"}, playBtn),
    volRow, hint,
    el("p",{class:"player-desc", text:f.desc})
  );

  function setSource(s){
    source = s; state.source = s;
    segAudio.classList.toggle("on", s==="audio");
    segYt.classList.toggle("on", s==="yt");
    stopAudio(false);
    if(s==="yt"){
      viz.style.display="none"; ytWrap.style.display="block"; ytWrap.innerHTML="";
      ytWrap.append(el("iframe",{ class:"yt-frame", src:youtubeSearchEmbed(f.yt),
        allow:"autoplay; encrypted-media", allowfullscreen:true, frameborder:"0" }));
      playBtn.style.display="none"; timeLbl.style.display="none"; volRow.style.display="none";
    } else {
      viz.style.display="grid"; ytWrap.style.display="none"; ytWrap.innerHTML="";
      playBtn.style.display=""; timeLbl.style.display=""; volRow.style.display="";
    }
  }
  segAudio.onclick = ()=> setSource("audio");
  segYt.onclick = ()=> setSource("yt");

  function toggle(){ playing ? stopAudio(true) : startAudio(); }

  function startAudio(){
    if(!f.file){ toast("Для цієї частоти лише YouTube"); setSource("yt"); return; }
    Main.play(f.file, { loop:true, vol:state.vol });
    playing = true; startedAt = Date.now();
    viz.classList.add("active");
    playBtn.replaceChildren(ICON.pause());
    tick = setInterval(()=>{ timeLbl.textContent = fmtTime((Date.now()-startedAt)/1000); }, 500);
  }

  async function stopAudio(logIt=false){
    Main.stop();
    viz.classList.remove("active");
    playBtn.replaceChildren(ICON.play());
    if(tick){ clearInterval(tick); tick=null; }
    if(playing && logIt){
      const dur = Math.round((Date.now()-startedAt)/1000);
      if(dur >= 20){
        try{ await Sessions.add({ type:"frequency", duration_seconds:dur,
          details:{ id:f.id, name:f.name, hz:f.hz } });
          toast(`Записано: ${f.name} • ${fmtTime(dur)}`);
        }catch(e){}
      }
    }
    playing = false;
  }

  function open(){ sheet.innerHTML=""; sheet.append(body); sheet.classList.add("show"); setSource(source); }
  function close(){ stopAudio(true); sheet.classList.remove("show"); setTimeout(()=>{ sheet.innerHTML=""; }, 260); onClose&&onClose(); }
  function dispose(){ stopAudio(false); sheet.classList.remove("show"); sheet.innerHTML=""; }

  return { open, close, dispose };
}
