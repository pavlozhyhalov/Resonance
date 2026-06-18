import { register, startRouter, navigate, go } from "./router.js";
import { Auth } from "./store.js";
import { el, toast } from "./ui.js";

import * as Home from "./pages/home.js";
import * as Frequencies from "./pages/frequencies.js";
import * as WimHof from "./pages/wimhof.js";
import * as Cold from "./pages/cold.js";
import * as Calendar from "./pages/calendar.js";
import * as Tasks from "./pages/tasks.js";

register("home",        { theme:"cosmic",  navKey:"home",        render: Home.render });
register("frequencies", { theme:"cosmic",  navKey:"frequencies", render: Frequencies.render });
register("wimhof",      { theme:"breath",  navKey:"wimhof",      render: WimHof.render });
register("cold",        { theme:"cold",    navKey:"cold",        render: Cold.render });
register("calendar",    { theme:"cosmic",  navKey:"calendar",    render: Calendar.render });
register("tasks",       { theme:"warm",    navKey:"tasks",       render: Tasks.render });

const NAV = [
  { route:"home",        label:"Головна",  glyph:"⌂" },
  { route:"frequencies", label:"Частоти",  glyph:"◎" },
  { route:"wimhof",      label:"Дихання",  glyph:"❂" },
  { route:"cold",        label:"Холод",    glyph:"❄" },
  { route:"calendar",    label:"Календар", glyph:"▦" },
  { route:"tasks",       label:"Цілі",     glyph:"✦" },
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
      el("span",{class:"nav-glyph", text:n.glyph}),
      el("span",{class:"nav-label", text:n.label})
    ));
  });

  app.append(topbar, view, nav);
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
      const res = mode==="in" ? await Auth.signIn(e,p) : await Auth.signUp(e,p);
      if(res.error){ msg.textContent = translate(res.error.message); }
      else if(mode==="up" && !res.data.session){
        msg.classList.add("ok"); msg.textContent = "Перевір пошту й підтверди акаунт, потім увійди.";
        setMode("in");
      } else {
        boot(); // session established
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

boot();
