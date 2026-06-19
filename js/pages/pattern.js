import { el, clear, fmtTime, fmtClock, toast } from "../ui.js?v=20260619124933";
import { go } from "../router.js?v=20260619124933";
import { cue, youtubeMusicSearch, stopAll } from "../audio.js?v=20260619124933";
import { Sessions, Settings } from "../store.js?v=20260619124933";

const BREATH_PATTERNS = {
  box: { title:"Квадратне дихання", inhale:4, holdIn:4, exhale:4, holdOut:4, cycles:8,
    info:"Рівні фази 4-4-4-4: вдих, затримка, видих, затримка. Заспокоює, повертає контроль над собою у стресі, гострить концентрацію. Використовують військові та спортсмени перед навантаженням.",
    benefits:["Знижує стрес і тривогу","Покращує концентрацію","Стабілізує пульс і тиск"] },
  r478: { title:"Дихання 4-7-8", inhale:4, holdIn:7, exhale:8, holdOut:0, cycles:6,
    info:"Вдих на 4, затримка на 7, повільний видих на 8. Довгий видих активує парасимпатичну нервову систему — тіло переходить у режим спокою. Найкраще працює перед сном.",
    benefits:["Допомагає швидше засинати","Знижує тривожність","Уповільнює серцебиття"] },
  coherent: { title:"Когерентне дихання", inhale:5.5, holdIn:0, exhale:5.5, holdOut:0, cycles:18,
    info:"Повільне рівне дихання ~5.5 секунди вдих і видих (≈5.5 циклів за хвилину). Максимізує варіабельність серцевого ритму (HRV) — показник стресостійкості й балансу нервової системи.",
    benefits:["Підвищує HRV (стресостійкість)","Балансує нервову систему","Покращує фокус і настрій"] },
};

export async function render(root, params){
  const type = params && params.type;
  const cfg = BREATH_PATTERNS[type];
  if(!cfg){ root.append(el("div",{class:"error-card", text:"Невідома практика."})); return ()=>{}; }

  let cycles = cfg.cycles;
  let sound = true;
  try{ const s = await Settings.get(); if(s["pattern_"+type]){ cycles = s["pattern_"+type].cycles ?? cycles; sound = s["pattern_"+type].sound ?? sound; } }catch(e){}

  const screen = el("div",{class:"wh-screen"});
  root.append(screen);
  let engine = null;
  showSetup();

  function patternStr(){
    const p=[`Вдих ${num(cfg.inhale)}`];
    if(cfg.holdIn) p.push(`Затримка ${num(cfg.holdIn)}`);
    p.push(`Видих ${num(cfg.exhale)}`);
    if(cfg.holdOut) p.push(`Затримка ${num(cfg.holdOut)}`);
    return p.join(" · ");
  }
  const cycleSec = cfg.inhale+cfg.holdIn+cfg.exhale+cfg.holdOut;

  function showSetup(){
    clear(screen);
    const cyc = slider("Циклів", cycles, 3, 40, 1, v=>{ cycles=v; estimate(); });
    const est = el("div",{class:"wh-est"});
    function estimate(){ est.textContent = `≈ ${fmtClock(Math.round(cycleSec*cycles))} практики`; }
    estimate();
    const sndToggle = toggle("Звук дихання", sound, v=> sound=v);

    screen.append(
      el("header",{class:"page-head center"},
        el("p",{class:"eyebrow", text:"Дихання"}),
        el("h1",{class:"page-title", text:cfg.title}),
        el("div",{class:"pattern-badge", text:patternStr()})
      ),
      el("div",{class:"info-card"},
        el("p",{class:"info-text", text:cfg.info}),
        el("div",{class:"benefit-list"},
          ...cfg.benefits.map(b=> el("div",{class:"benefit"}, el("span",{class:"benefit-dot"}), b)))
      ),
      el("div",{class:"wh-config"}, cyc, est, sndToggle),
      el("a",{class:"yt-music-btn", href:youtubeMusicSearch("calm meditation music"), target:"_blank", rel:"noopener"},
        "♪ Увімкнути музику в YouTube Music"),
      el("button",{class:"btn primary big", onclick:start}, "Почати")
    );
  }

  function start(){
    Settings.save({ ["pattern_"+type]:{ cycles, sound } }).catch(()=>{});
    engine = runSession();
  }

  function runSession(){
    const startTime = Date.now();
    let stopped=false, timers=[];
    const orb = el("div",{class:"orb"}, el("span",{class:"orb-label"}));
    const phaseLbl = el("div",{class:"wh-phase"});
    const cycleLbl = el("div",{class:"wh-round"});
    const bigTime = el("div",{class:"wh-bigtime"});
    const stage = el("div",{class:"wh-stage"}, cycleLbl, phaseLbl, orb, bigTime);
    const stopBtn = el("button",{class:"btn ghost small", onclick:stop}, "Зупинити");
    clear(screen); screen.append(stage, el("div",{class:"wh-stage-foot"}, stopBtn));

    const phases=[["Вдих",cfg.inhale,"in","up"]];
    if(cfg.holdIn) phases.push(["Затримай",cfg.holdIn,null,"up"]);
    phases.push(["Видих",cfg.exhale,"out","down"]);
    if(cfg.holdOut) phases.push(["Порожньо",cfg.holdOut,null,"down"]);

    let c=0;
    function runCycle(){
      if(stopped) return;
      c++;
      if(c>cycles){ finishUp(); return; }
      cycleLbl.textContent=`Цикл ${c} / ${cycles}`;
      runPhase(0);
    }
    function runPhase(i){
      if(stopped) return;
      if(i>=phases.length){ runCycle(); return; }
      const [label,sec,cueKind,dir]=phases[i];
      phaseLbl.textContent=label;
      if(dir==="up"){ orb.style.setProperty("--breath",sec+"s"); orb.classList.add("inhale"); orb.classList.remove("exhale"); orb.querySelector(".orb-label").textContent="вдих"; }
      if(dir==="down"){ orb.style.setProperty("--breath",sec+"s"); orb.classList.add("exhale"); orb.classList.remove("inhale"); orb.querySelector(".orb-label").textContent="видих"; }
      if(!["up","down"].includes(dir)){} 
      if(cueKind && sound) cue(cueKind);
      const end=Date.now()+sec*1000;
      const iv=setInterval(()=>{ bigTime.textContent=Math.ceil((end-Date.now())/1000); },100);
      timers.push(iv);
      const to=setTimeout(()=>{ clearInterval(iv); runPhase(i+1); }, sec*1000);
      timers.push(to);
    }
    function clearAll(){ timers.forEach(t=>{clearTimeout(t);clearInterval(t);}); timers=[]; }
    function stop(){ if(stopped) return; stopped=true; clearAll(); const secs=Math.round((Date.now()-startTime)/1000); if(secs>=30) finish(secs,true); else showSetup(); }
    function finishUp(){ stopped=true; clearAll(); finish(Math.round((Date.now()-startTime)/1000), false); }
    runCycle();
    return { stop:()=>{ stopped=true; clearAll(); } };
  }

  async function finish(elapsed, partial){
    let saved=false;
    try{ await Sessions.add({ type:"meditation", duration_seconds:elapsed, details:{ practice:type, title:cfg.title, partial } }); saved=true; }catch(e){}
    clear(screen);
    screen.append(
      el("header",{class:"page-head center"},
        el("p",{class:"eyebrow", text:"Готово"}),
        el("h1",{class:"page-title", text: partial?"Практику зупинено":"Практику завершено"}),
        saved? el("p",{class:"page-sub", text:"Збережено в календар"}) : el("p",{class:"page-sub warn", text:"Не збережено"})
      ),
      el("div",{class:"cold-big"}, el("strong",{text:fmtClock(elapsed)}), el("span",{text:"практики"})),
      el("div",{class:"row gap"},
        el("button",{class:"btn primary", onclick:showSetup}, "Ще раз"),
        el("button",{class:"btn ghost", onclick:()=>go("breathing")}, "До практик")
      )
    );
  }

  return ()=>{ if(engine) engine.stop(); stopAll(); };
}

function num(x){ return Number.isInteger(x)? x : x.toFixed(1); }

function slider(label, value, min, max, step, onChange){
  const val = el("span",{class:"slider-val", text:String(value)});
  const input = el("input",{type:"range", min:String(min), max:String(max), step:String(step), value:String(value), class:"slider-input",
    oninput:e=>{ const v=+e.target.value; val.textContent=String(v); onChange(v); }});
  return el("div",{class:"slider-row"}, el("div",{class:"slider-top"}, el("span",{class:"slider-label", text:label}), val), input);
}
function toggle(label, value, onChange){
  let v=value;
  const sw=el("button",{class:"switch"+(v?" on":""), onclick:()=>{ v=!v; sw.classList.toggle("on",v); onChange(v); }});
  sw.append(el("span",{class:"switch-knob"}));
  return el("div",{class:"toggle-row"}, el("span",{class:"toggle-label", text:label}), sw);
}
