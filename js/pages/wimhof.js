import { el, clear, fmtTime, fmtClock, toast } from "../ui.js";
import { go } from "../router.js";
import { playSoundscape, Bg, cue, SOUNDSCAPES, stopAll } from "../audio.js";
import { Sessions, Settings } from "../store.js";

const DEFAULTS = { rounds:3, breaths:30, pace:3.2, recovery:15, cueVisual:true, cueSound:true, sound:"calm", vol:0.6 };

export async function render(root){
  let cfg = { ...DEFAULTS };
  try{ const s = await Settings.get(); if(s.wimhof) cfg = { ...cfg, ...s.wimhof }; }catch(e){}

  const screen = el("div",{class:"wh-screen"});
  root.append(screen);
  let engine = null;
  showSetup();

  function saveCfg(){ Settings.save({ wimhof: cfg }).catch(()=>{}); }

  function showSetup(){
    clear(screen);
    const rounds = stepper("Раундів", cfg.rounds, 1, 8, v=>{ cfg.rounds=v; });
    const breaths = slider("Дихань у раунді", cfg.breaths, 20, 50, 1, v=>{ cfg.breaths=v; });
    const pace = stepper("Темп дихання, с", cfg.pace, 2, 6, v=>{ cfg.pace=v; }, 0.2, 1);
    const recovery = stepper("Відновлення, с", cfg.recovery, 10, 30, v=>{ cfg.recovery=v; });

    const soundSel = el("select",{class:"select", onchange:e=>{ cfg.sound=e.target.value; }});
    SOUNDSCAPES.forEach(s=> soundSel.append(el("option",{value:s.id, text:s.label, selected: s.id===cfg.sound})));
    const volume = slider("Гучність музики", Math.round(cfg.vol*100), 0, 100, 5, v=>{ cfg.vol=v/100; }, "%");

    const cueV = toggle("Візуальні підказки", cfg.cueVisual, v=> cfg.cueVisual=v);
    const cueS = toggle("Звукові підказки", cfg.cueSound, v=> cfg.cueSound=v);

    screen.append(
      el("header",{class:"page-head center"},
        el("p",{class:"eyebrow", text:"Дихання"}),
        el("h1",{class:"page-title", text:"Метод Віма Хофа"}),
        el("p",{class:"page-sub", text:"Глибокі дихання, потім затримка на видиху. Подвійний тап або кнопка завершують затримку."})
      ),
      el("div",{class:"wh-config"}, rounds, breaths, pace, recovery,
        el("label",{class:"field"}, el("span",{class:"field-label", text:"Фонова музика"}), soundSel),
        volume, cueV, cueS
      ),
      el("button",{class:"btn primary big", onclick:start}, "Почати"),
      el("div",{class:"wh-note", text:"Не практикуй у воді, за кермом або стоячи. Можливе запаморочення."})
    );
  }

  function start(){ saveCfg(); engine = runSession(cfg, screen, { onFinish:finish, onExit:showSetup }); }

  async function finish(result){
    let saved = false;
    try{
      await Sessions.add({ type:"wimhof", duration_seconds: result.totalSeconds,
        details:{ rounds: result.retentions.length, breaths: cfg.breaths, retentions: result.retentions, partial: !!result.partial } });
      saved = true;
    }catch(e){}
    showFinish(result, saved);
  }

  function showFinish(result, saved){
    clear(screen);
    const has = result.retentions.length>0;
    const best = has ? Math.max(...result.retentions) : 0;
    screen.append(
      el("header",{class:"page-head center"},
        el("p",{class:"eyebrow", text:"Готово"}),
        el("h1",{class:"page-title", text: result.partial ? "Сесію зупинено" : "Сесію завершено"}),
        saved ? el("p",{class:"page-sub", text:"Збережено в календар"})
              : el("p",{class:"page-sub warn", text:"Не збережено (немає зʼєднання чи входу)"})
      ),
      has ? el("div",{class:"wh-results"},
        ...result.retentions.map((r,i)=>
          el("div",{class:"wh-result-row"+(r===best?" best":"")},
            el("span",{class:"wh-result-round", text:`Раунд ${i+1}`}),
            el("span",{class:"wh-result-time", text:fmtTime(r)})
          ))
      ) : el("div",{class:"muted small", text:"Жодної затримки не зафіксовано."}),
      el("div",{class:"wh-total"}, el("span",{text:"Загалом"}), el("strong",{text:fmtClock(result.totalSeconds)})),
      el("div",{class:"row gap"},
        el("button",{class:"btn primary", onclick:showSetup}, "Ще раз"),
        el("button",{class:"btn ghost", onclick:()=>go("home")}, "Додому")
      )
    );
  }

  return () => { if(engine) engine.stop(); stopAll(); };
}

// ============================================================================
function runSession(cfg, screen, { onFinish, onExit }){
  let round = 0;
  const retentions = [];
  const sessionStart = Date.now();
  let timers = [];
  let stopped = false;
  let endRetentionFn = null;

  if(cfg.sound !== "none") playSoundscape(cfg.sound, cfg.vol);

  const orb = el("div",{class:"orb"}, el("span",{class:"orb-label"}));
  const phaseLbl = el("div",{class:"wh-phase"});
  const roundLbl = el("div",{class:"wh-round"});
  const bigTime = el("div",{class:"wh-bigtime"});
  const sub = el("div",{class:"wh-sub"});
  const actionBtn = el("button",{class:"btn primary wh-action", style:"display:none"});
  const stage = el("div",{class:"wh-stage"}, roundLbl, phaseLbl, orb, bigTime, sub, actionBtn);
  const stopBtn = el("button",{class:"btn ghost small", onclick:abort}, "Зупинити");

  clear(screen);
  screen.append(stage, el("div",{class:"wh-stage-foot"}, stopBtn));

  // double-tap on stage ends retention
  let lastTap = 0;
  stage.addEventListener("pointerdown", ()=>{
    const now = Date.now();
    if(now - lastTap < 350 && endRetentionFn){ endRetentionFn(); }
    lastTap = now;
  });

  function later(fn, ms){ const t=setTimeout(fn, ms); timers.push(t); return t; }
  function clearTimers(){ timers.forEach(t=>{ clearTimeout(t); clearInterval(t); }); timers=[]; }

  function abort(){
    const partialDur = Math.round((Date.now()-sessionStart)/1000);
    stop();
    // log partial if any retention OR at least 30s practised
    if(retentions.length>0 || partialDur>=30){
      onFinish({ retentions, totalSeconds: partialDur, partial:true });
    } else {
      onExit();
    }
  }
  function stop(){ stopped=true; endRetentionFn=null; clearTimers(); Bg.stop(0.3); }

  function nextRound(){
    if(stopped) return;
    round++;
    if(round > cfg.rounds){ finishUp(); return; }
    roundLbl.textContent = `Раунд ${round} / ${cfg.rounds}`;
    breathePhase();
  }

  function breathePhase(){
    actionBtn.style.display="none";
    phaseLbl.textContent = "Дихай глибоко";
    bigTime.textContent = "";
    orb.className = "orb";
    let count = 0;
    const half = cfg.pace*1000*0.5;
    orb.style.setProperty("--breath", (cfg.pace*0.5).toFixed(2)+"s");

    function inhale(){
      if(stopped) return;
      count++;
      sub.textContent = `${count} / ${cfg.breaths}`;
      if(cfg.cueVisual) orb.querySelector(".orb-label").textContent = "Вдих";
      orb.classList.add("inhale"); orb.classList.remove("exhale");
      if(cfg.cueSound) cue("in");
      later(exhale, half);
    }
    function exhale(){
      if(stopped) return;
      if(cfg.cueVisual) orb.querySelector(".orb-label").textContent = "Видих";
      orb.classList.add("exhale"); orb.classList.remove("inhale");
      if(cfg.cueSound) cue("out");
      if(count >= cfg.breaths) later(retentionPhase, half);
      else later(inhale, half);
    }
    later(inhale, 400);
  }

  function retentionPhase(){
    phaseLbl.textContent = "Затримай на видиху";
    sub.textContent = "Подвійний тап по екрану — завершити";
    orb.className = "orb hold";
    orb.querySelector(".orb-label").textContent = "Тримай";
    if(cfg.cueSound) cue("gong");
    const start = Date.now();
    const id = setInterval(()=>{ bigTime.textContent = fmtTime((Date.now()-start)/1000); }, 200);
    timers.push(id);

    actionBtn.textContent = "Завершити затримку";
    actionBtn.style.display="";
    actionBtn.onclick = end;

    endRetentionFn = end;
    function end(){
      if(stopped) return;
      clearInterval(id);
      endRetentionFn = null;
      actionBtn.style.display="none";
      retentions.push(Math.round((Date.now()-start)/1000));
      recoveryPhase();
    }
  }

  function recoveryPhase(){
    phaseLbl.textContent = "Глибокий вдих і тримай";
    sub.textContent = "";
    orb.className = "orb recover";
    orb.querySelector(".orb-label").textContent = "Вдих";
    if(cfg.cueSound) cue("in");
    let left = cfg.recovery;
    bigTime.textContent = fmtTime(left);
    const id = setInterval(()=>{
      left--;
      bigTime.textContent = fmtTime(Math.max(0,left));
      if(left<=0){ clearInterval(id); if(cfg.cueSound) cue("out"); nextRound(); }
    }, 1000);
    timers.push(id);
  }

  function finishUp(){
    stop();
    onFinish({ retentions, totalSeconds: Math.round((Date.now()-sessionStart)/1000), partial:false });
  }

  nextRound();
  return { stop };
}

// ---------- controls ----------
function stepper(label, value, min, max, onChange, step=1, decimals=0){
  let v = value;
  const out = el("span",{class:"stepper-val", text:fmt(v)});
  function fmt(x){ return decimals ? x.toFixed(decimals) : String(x); }
  function set(nv){ v = Math.min(max, Math.max(min, Math.round(nv/step)*step)); v=+v.toFixed(decimals); out.textContent=fmt(v); onChange(v); }
  return el("div",{class:"stepper"},
    el("span",{class:"stepper-label", text:label}),
    el("div",{class:"stepper-ctl"},
      el("button",{class:"stepper-btn", onclick:()=>set(v-step), text:"−"}),
      out,
      el("button",{class:"stepper-btn", onclick:()=>set(v+step), text:"+"})
    )
  );
}

function slider(label, value, min, max, step, onChange, unit=""){
  const val = el("span",{class:"slider-val", text:value+unit});
  const input = el("input",{type:"range", min:String(min), max:String(max), step:String(step), value:String(value), class:"slider-input",
    oninput:e=>{ const v=+e.target.value; val.textContent=v+unit; onChange(v); }});
  return el("div",{class:"slider-row"},
    el("div",{class:"slider-top"}, el("span",{class:"slider-label", text:label}), val),
    input
  );
}

function toggle(label, value, onChange){
  let v = value;
  const sw = el("button",{class:"switch"+(v?" on":""), onclick:()=>{ v=!v; sw.classList.toggle("on",v); onChange(v); }});
  sw.append(el("span",{class:"switch-knob"}));
  return el("div",{class:"toggle-row"}, el("span",{class:"toggle-label", text:label}), sw);
}
