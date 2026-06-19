import { register, startRouter, navigate, go } from "./router.js?v=20260619080452";
import { Auth } from "./store.js?v=20260619080452";
import { el, toast } from "./ui.js?v=20260619080452";
import { ICON } from "./icons.js?v=20260619080452";
import { unlockAudio, onAudioUnlock, isAudioUnlocked, cue } from "./audio.js?v=20260619080452";

import * as Home from "./pages/home.js?v=20260619080452";
import * as Frequencies from "./pages/frequencies.js?v=20260619080452";
import * as FreqDetail from "./pages/freq.js?v=20260619080452";
import * as Breathing from "./pages/breathing.js?v=20260619080452";
import * as WimHof from "./pages/wimhof.js?v=20260619080452";
import * as Pattern from "./pages/pattern.js?v=20260619080452";
import * as Cold from "./pages/cold.js?v=20260619080452";
import * as Calendar from "./pages/calendar.js?v=20260619080452";
import * as Tasks from "./pages/tasks.js?v=20260619080452";
import * as Analytics from "./pages/analytics.js?v=20260619080452";

register("home",        { theme:"cosmic",  navKey:"home",        render: Home.render });
register("frequencies", { theme:"freq",    navKey:"frequencies", render: Frequencies.render });
register("freq",        { theme:"freq",    navKey:"frequencies", render: FreqDetail.render });
register("breathing",   { theme:"breath",  navKey:"breathing",   render: Breathing.render });
register("wimhof",      { theme:"breath",  navKey:"breathing",   render: WimHof.render });
register("pattern",     { theme:"breath",  navKey:"breathing",   render: Pattern.render });
register("cold",        { theme:"cold",    navKey:"cold",        render: Cold.render });
register("calendar",    { theme:"cal",     navKey:"calendar",    render: Calendar.render });
register("analytics",   { theme:"cal",     navKey:"calendar",    render: Analytics.render });
register("tasks",       { theme:"warm",    navKey:"tasks",       render: Tasks.render });

const NAV = [
  { route:"home",        label:"Головна",  icon:"home" },
  { route:"frequencies", label:"Частоти",  icon:"freq" },
  { route:"breathing",   label:"Дихання",  icon:"breath" },
  { route:"cold",        label:"Холод",    icon:"cold" },
  { route:"calendar",    label:"Календар", icon:"calendar" },
  { route:"tasks",       label:"Цілі",     icon:"tasks" },
];

function buildShell(){
  const app = document.getElementById("app");
  app.innerHTML = "";

  const topbar = el("div",{class:"topbar"},
    el("button",{class:"brand", onclick:()=>go("home")},
      el("span",{class:"brand-mark", text:"◍"}), el("span",{class:"brand-name", text:"Resonance"})),
    el("button",{class:"signout", title:"Вийти", onclick:async()=>{ await Auth.signOut(); location.reload(); }, text:"⏻"})
  );

  const view = el("main",{id:"view", class:"view"});

  const nav = el("nav",{class:"bottom-nav"});
  NAV.forEach(n=>{
    nav.append(el("button",{class:"nav-item", "data-route":n.route, onclick:()=>go(n.route)},
      el("span",{class:"nav-glyph"}, ICON[n.icon]()),
      el("span",{class:"nav-label", text:n.label})
    ));
  });

  app.append(topbar, view, nav);

  // visible "enable sound" button (iOS needs a gesture to allow audio)
  if(!isAudioUnlocked()){
    const banner = el("button",{class:"audio-banner", onclick:()=>{
      unlockAudio();
      try{ cue("in"); }catch(e){}
      toast("Звук увімкнено");
    }},
      el("span",{class:"ab-ic", text:"🔊"}),
      el("span",{class:"ab-text", text:"Натисни, щоб увімкнути звук"})
    );
    app.append(banner);
    onAudioUnlock(()=>{ banner.classList.add("hide"); setTimeout(()=>banner.remove(), 350); });
  }
}

// ---------------- auth gate ----------------
function authGate(){
  const app = document.getElementById("app");
  app.innerHTML = "";
  let mode = "in"; // in | up

  const email = el("input",{class:"input", type:"email", placeholder:"Пошта", autocomplete:"email"});
  const pass = el("input",{class:"input", type:"password", placeholder:"Пароль", autocomplete:"current-password"});
  const msg = el("div",{class:"auth-msg"});
  const submit = el("button",{class:"btn primary big"}, "Увійти");
  const swap = el("button",{class:"auth-swap", text:"Немає акаунту? Зареєструватися"});

  function setMode(m){
    mode = m;
    submit.textContent = m==="in" ? "Увійти" : "Створити акаунт";
    swap.textContent = m==="in" ? "Немає акаунту? Зареєструватися" : "Вже є акаунт? Увійти";
    msg.textContent = "";
  }
  swap.onclick = ()=> setMode(mode==="in"?"up":"in");

  submit.onclick = async ()=>{
    const e = email.value.trim(), p = pass.value;
    if(!e || !p){ msg.textContent = "Введи пошту й пароль."; return; }
    submit.disabled = true; submit.textContent = "…";
    try{
      if(mode==="up"){
        const res = await Auth.signUp(e,p);
        if(res.error){ msg.textContent = translate(res.error.message); }
        else if(res.data.session){ boot(); return; }
        else {
          // account is auto-confirmed in the DB → sign in right away
          const si = await Auth.signIn(e,p);
          if(si.error){ msg.classList.add("ok"); msg.textContent = "Акаунт створено. Тепер увійди."; setMode("in"); }
          else { boot(); return; }
        }
      } else {
        const res = await Auth.signIn(e,p);
        if(res.error){ msg.textContent = translate(res.error.message); }
        else { boot(); return; }
      }
    }catch(err){ msg.textContent = "Помилка зʼєднання."; }
    submit.disabled = false; setMode(mode);
  };

  const card = el("div",{class:"auth-card"},
    el("div",{class:"auth-brand"}, el("span",{class:"brand-mark big", text:"◍"}), el("h1",{class:"auth-title", text:"Resonance"})),
    el("p",{class:"auth-tag", text:"Частоти, дихання Віма Хофа та холод — у синхроні між пристроями."}),
    el("label",{class:"field"}, el("span",{class:"field-label", text:"Пошта"}), email),
    el("label",{class:"field"}, el("span",{class:"field-label", text:"Пароль"}), pass),
    submit, msg, swap
  );
  const wrap = el("div",{class:"auth-screen", "data-theme":"cosmic"}, card);
  document.body.dataset.theme = "cosmic";
  app.append(wrap);
}

function translate(m){
  if(/Invalid login/i.test(m)) return "Невірна пошта або пароль.";
  if(/already registered/i.test(m)) return "Така пошта вже зареєстрована.";
  if(/at least 6/i.test(m)) return "Пароль має бути від 6 символів.";
  if(/Email not confirmed/i.test(m)) return "Підтверди пошту, перш ніж входити.";
  return m;
}

// ---------------- boot ----------------
export async function boot(){
  const session = await Auth.session();
  if(!session){ authGate(); return; }
  buildShell();
  startRouter();
}

Auth.onChange((session)=>{
  // react to token refresh / external sign-out
  if(!session && document.getElementById("view")){ location.reload(); }
});

// Unlock audio on the very first user interaction (iOS requirement).
["pointerdown","touchend","click"].forEach(ev=>
  window.addEventListener(ev, ()=>unlockAudio(), { once:false, passive:true })
);

boot();
