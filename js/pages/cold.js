import { el, clear, fmtTime, toast } from "../ui.js";
import { go } from "../router.js";
import { blip, youtubeMusicSearch, stopAll } from "../audio.js";
import { Sessions, Settings } from "../store.js";

const PRESETS = [30, 60, 120, 180, 300];

export async function render(root){
  let cfg = { mode:"shower", target:60 };
  try{ const s = await Settings.get(); if(s.cold) cfg = { ...cfg, ...s.cold }; }catch(e){}

  const screen = el("div",{class:"cold-screen"});
  root.append(screen);
  let timer = null;
  showSetup();

  function saveCfg(){ Settings.save({ cold: cfg }).catch(()=>{}); }

  function showSetup(){
    clear(screen);
    const modeSeg = el("div",{class:"seg-group wide"});
    [["shower","Холодний душ","🚿"],["bath","Крижана ванна","🛁"]].forEach(([id,label,ic])=>{
      const b = el("button",{class:"seg "+(cfg.mode===id?"on":""), onclick:()=>{
        cfg.mode=id; modeSeg.querySelectorAll(".seg").forEach(s=>s.classList.remove("on")); b.classList.add("on");
      }}, `${ic} ${label}`);
      modeSeg.append(b);
    });

    const presetRow = el("div",{class:"preset-row"});
    function renderPresets(){
      clear(presetRow);
      PRESETS.forEach(p=> presetRow.append(el("button",{class:"preset"+(cfg.target===p?" on":""), onclick:()=>{ cfg.target=p; renderPresets(); }, text:fmtTime(p)})));
      presetRow.append(el("button",{class:"preset"+(!PRESETS.includes(cfg.target)?" on":""), onclick:()=>{
        const v = prompt("Скільки секунд?", cfg.target); const n=parseInt(v,10); if(n>0){ cfg.target=n; renderPresets(); }
      }, text:"Інше"}));
    }
    renderPresets();

    screen.append(
      el("header",{class:"page-head center"},
        el("p",{class:"eyebrow", text:"Холод"}),
        el("h1",{class:"page-title", text:"Практика холоду"}),
        el("p",{class:"page-sub", text:"Дихай спокійно й рівно. Виходь, якщо німіють кінцівки."})
      ),
      el("div",{class:"cold-config"},
        el("div",{class:"field"}, el("span",{class:"field-label", text:"Тип"}), modeSeg),
        el("div",{class:"field"}, el("span",{class:"field-label", text:"Тривалість"}), presetRow)
      ),
      el("a",{class:"yt-music-btn", href:youtubeMusicSearch("focus calm music"), target:"_blank", rel:"noopener"},
        "♪ Увімкнути музику в YouTube Music"),
      el("button",{class:"btn primary big cold", onclick:start}, "Зануритись")
    );
  }

  function start(){ saveCfg(); timer = runTimer(cfg, screen, { onFinish:finish, onExit:showSetup }); }

  async function finish(elapsed){
    let saved = false;
    try{
      await Sessions.add({ type:"cold", duration_seconds: elapsed, details:{ mode: cfg.mode, target: cfg.target } });
      saved = true;
    }catch(e){}
    clear(screen);
    screen.append(
      el("header",{class:"page-head center"},
        el("p",{class:"eyebrow", text:"Готово"}),
        el("h1",{class:"page-title", text: cfg.mode==="bath"?"Ванна завершена":"Душ завершено"}),
        saved ? el("p",{class:"page-sub", text:"Збережено в календар"})
              : el("p",{class:"page-sub warn", text:"Не збережено (немає зʼєднання чи входу)"})
      ),
      el("div",{class:"cold-big"}, el("strong",{text:fmtTime(elapsed)}), el("span",{text:"у холоді"})),
      el("div",{class:"row gap"},
        el("button",{class:"btn primary cold", onclick:showSetup}, "Ще раз"),
        el("button",{class:"btn ghost", onclick:()=>go("home")}, "Додому")
      )
    );
  }

  return () => { if(timer) timer.stop(); stopAll(); };
}

function runTimer(cfg, screen, { onFinish, onExit }){
  let elapsed = 0, paused = false, stopped = false;
  const start = Date.now();
  let id = null;

  const R = 130, C = 2*Math.PI*R;
  const ring = svgRing(R, C);
  const prog = ring.querySelector(".ring-prog");
  const timeLbl = el("div",{class:"cold-time", text:fmtTime(cfg.target)});
  const phase = el("div",{class:"cold-phase", text:"Дихай повільно"});
  const wrap = el("div",{class:"cold-ring-wrap"}, ring, el("div",{class:"cold-ring-center"}, timeLbl, phase));

  const pauseBtn = el("button",{class:"btn ghost small", onclick:togglePause}, "Пауза");
  const stopBtn = el("button",{class:"btn ghost small", onclick:()=>end(false)}, "Завершити");

  clear(screen);
  screen.append(
    el("div",{class:"cold-running"},
      el("div",{class:"cold-mode-tag", text: cfg.mode==="bath"?"🛁 Крижана ванна":"🚿 Холодний душ"}),
      wrap, el("div",{class:"row gap center"}, pauseBtn, stopBtn)
    )
  );

  let pausedAccum = 0, pauseStart = 0;
  function togglePause(){
    paused = !paused;
    if(paused){ pauseStart = Date.now(); pauseBtn.textContent = "Продовжити"; }
    else { pausedAccum += Date.now()-pauseStart; pauseBtn.textContent = "Пауза"; }
  }

  id = setInterval(()=>{
    if(stopped || paused) return;
    elapsed = Math.round((Date.now()-start-pausedAccum)/1000);
    const left = Math.max(0, cfg.target - elapsed);
    timeLbl.textContent = fmtTime(left);
    prog.style.strokeDashoffset = String(C*(1-Math.min(1, elapsed/cfg.target)));
    if(left<=0){ blip("end"); end(true); }
  }, 250);

  function end(){
    if(stopped) return;
    stopped = true; clearInterval(id);
    onFinish(elapsed);
  }
  function stop(){ stopped=true; clearInterval(id); }
  return { stop };
}

function svgRing(R, C){
  const ns="http://www.w3.org/2000/svg";
  const size=(R+18)*2, cx=size/2;
  const svg=document.createElementNS(ns,"svg");
  svg.setAttribute("viewBox",`0 0 ${size} ${size}`); svg.setAttribute("class","cold-ring");
  const bg=document.createElementNS(ns,"circle");
  bg.setAttribute("cx",cx); bg.setAttribute("cy",cx); bg.setAttribute("r",R); bg.setAttribute("class","ring-bg");
  const pr=document.createElementNS(ns,"circle");
  pr.setAttribute("cx",cx); pr.setAttribute("cy",cx); pr.setAttribute("r",R); pr.setAttribute("class","ring-prog");
  pr.setAttribute("transform",`rotate(-90 ${cx} ${cx})`);
  pr.style.strokeDasharray=String(C); pr.style.strokeDashoffset=String(C);
  svg.append(bg,pr); return svg;
}
