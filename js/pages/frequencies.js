import { el, clear, fmtTime, toast } from "../ui.js";
import { FREQUENCIES, EFFECT_LABELS, CAT_LABELS, STATUS_LABELS } from "../data.js";
import { Tone, youtubeSearchEmbed, stopAll } from "../audio.js";
import { Sessions } from "../store.js";

export async function render(root){
  const state = { effect:"all", cats:new Set(["binaural","solfeggio","other"]), source:"synth" };
  let player = null; // active player controller

  // ---- filters ----
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
      el("p",{class:"page-sub", text:"Синтез грає точну частоту офлайн. Для бінаурал-ритмів потрібні навушники."})
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

  // cleanup on leaving page
  return () => { if(player) player.dispose(); };
}

// ----------------------------------------------------------------------------
function buildPlayer(f, state, sheet, onClose){
  let playing = false;
  let startedAt = null;
  let tick = null;
  let source = state.source;

  const viz = el("div",{class:"viz"},
    el("span",{class:"viz-ring r1"}), el("span",{class:"viz-ring r2"}), el("span",{class:"viz-ring r3"}),
    el("span",{class:"viz-core", text:f.hzLabel})
  );
  // ring animation speed scales with frequency (faster = quicker pulse, clamped)
  const period = Math.max(0.6, Math.min(4, 60 / Math.max(f.hz, 2)));
  viz.style.setProperty("--pulse", period.toFixed(2)+"s");

  const timeLbl = el("div",{class:"player-time", text:"0:00"});

  const segSynth = el("button",{class:"seg "+(source==="synth"?"on":""), text:"Синтез"});
  const segYt = el("button",{class:"seg "+(source==="yt"?"on":""), text:"YouTube"});
  const seg = el("div",{class:"seg-group"}, segSynth, segYt);

  const ytWrap = el("div",{class:"yt-wrap", style:"display:none"});

  const playBtn = el("button",{class:"play-btn", onclick:toggle}, playIcon());
  const vol = el("input",{type:"range", min:"0", max:"100", value:"40", class:"vol",
    oninput:e=> Tone.setVolume(e.target.value/100) });

  const hint = f.synth.kind==="binaural"
    ? el("div",{class:"player-hint", text:"🎧 Бінаурал-ритм — слухай у навушниках"})
    : null;

  const closeBtn = el("button",{class:"sheet-close", onclick:close, text:"✕"});

  const body = el("div",{class:"player-body"},
    closeBtn,
    el("div",{class:"player-titlewrap"},
      el("div",{class:"player-name", text:f.name}),
      el("div",{class:"player-cat", text:CAT_LABELS[f.cat]})
    ),
    seg,
    viz,
    ytWrap,
    timeLbl,
    el("div",{class:"player-controls"}, playBtn),
    el("div",{class:"vol-row"}, el("span",{class:"vol-ic", text:"🔊"}), vol),
    hint,
    el("p",{class:"player-desc", text:f.desc})
  );

  function setSource(s){
    source = s; state.source = s;
    segSynth.classList.toggle("on", s==="synth");
    segYt.classList.toggle("on", s==="yt");
    stopSound();
    if(s==="yt"){
      viz.style.display="none";
      ytWrap.style.display="block";
      ytWrap.innerHTML = "";
      ytWrap.append(el("iframe",{
        class:"yt-frame", src:youtubeSearchEmbed(f.yt), allow:"autoplay; encrypted-media",
        allowfullscreen:true, frameborder:"0"
      }));
      playBtn.style.display="none";
      timeLbl.style.display="none";
      document.querySelector(".vol-row").style.display="none";
    } else {
      viz.style.display="grid";
      ytWrap.style.display="none"; ytWrap.innerHTML="";
      playBtn.style.display="";
      timeLbl.style.display="";
      document.querySelector(".vol-row").style.display="";
    }
  }
  segSynth.onclick = ()=> setSource("synth");
  segYt.onclick = ()=> setSource("yt");

  function toggle(){ playing ? stopSound(true) : startSound(); }

  function startSound(){
    Tone.setVolume(vol.value/100);
    Tone.play(f.synth);
    playing = true; startedAt = Date.now();
    viz.classList.add("active");
    playBtn.replaceChildren(pauseIcon());
    tick = setInterval(()=>{
      timeLbl.textContent = fmtTime((Date.now()-startedAt)/1000);
    }, 500);
  }

  async function stopSound(logIt=false){
    Tone.stop();
    viz.classList.remove("active");
    playBtn.replaceChildren(playIcon());
    if(tick){ clearInterval(tick); tick=null; }
    if(playing && logIt){
      const dur = Math.round((Date.now()-startedAt)/1000);
      if(dur >= 20){
        try{ await Sessions.add({ type:"frequency", duration_seconds:dur,
          details:{ id:f.id, name:f.name, hz:f.hz, source:"synth" } });
          toast(`Записано: ${f.name} • ${fmtTime(dur)}`);
        }catch(e){ /* not logged-in or offline */ }
      }
    }
    playing = false;
  }

  function open(){
    sheet.innerHTML = ""; sheet.append(body);
    sheet.classList.add("show");
    setSource(source);
  }
  function close(){ stopSound(true); sheet.classList.remove("show"); setTimeout(()=>{ sheet.innerHTML=""; }, 260); onClose&&onClose(); }
  function dispose(){ stopSound(false); sheet.classList.remove("show"); sheet.innerHTML=""; }

  return { open, close, dispose };
}

function playIcon(){ const s=icon(); s.innerHTML='<path d="M8 5v14l11-7z"/>'; return s; }
function pauseIcon(){ const s=icon(); s.innerHTML='<path d="M6 5h4v14H6zM14 5h4v14h-4z"/>'; return s; }
function icon(){ const ns="http://www.w3.org/2000/svg"; const s=document.createElementNS(ns,"svg"); s.setAttribute("viewBox","0 0 24 24"); s.setAttribute("class","ico"); return s; }
