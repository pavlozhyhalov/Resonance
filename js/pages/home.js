import { el, spinner, fmtClock, todayStr } from "../ui.js?v=20260619085346";
import { go } from "../router.js?v=20260619085346";
import { ICON } from "../icons.js?v=20260619085346";
import { Sessions, pointsBalance } from "../store.js?v=20260619085346";

const TILES = [
  { route:"frequencies", title:"Музика по частотах", sub:"Бінаурал, Solfeggio, своя музика", icon:"freq",  cls:"t-freq" },
  { route:"breathing",   title:"Дихальні практики",  sub:"Вім Хоф, 4-7-8, квадратне…",     icon:"breath",cls:"t-breath" },
  { route:"cold",        title:"Практика холоду",    sub:"Душ і крижані ванни",           icon:"cold",  cls:"t-cold" },
  { route:"calendar",    title:"Календар і аналіз",  sub:"Твоя активність у динаміці",    icon:"calendar",cls:"t-cal" },
  { route:"tasks",       title:"Завдання й винагороди", sub:"Бали за корисний час",       icon:"tasks", cls:"t-task" },
];

function streakFrom(sessions){
  const days = new Set(sessions.map(s => s.started_at.slice(0,10)));
  let streak = 0, d = new Date();
  if(!days.has(todayStr(d))) d.setDate(d.getDate()-1);
  for(;;){ if(days.has(todayStr(d))){ streak++; d.setDate(d.getDate()-1); } else break; }
  return streak;
}

export async function render(root){
  const head = el("header",{class:"home-hero"},
    el("p",{class:"eyebrow", text:"Resonance"}),
    el("h1",{class:"home-title", html:"Спокій, дихання<br>і холод — в одному місці"}),
    el("p",{class:"home-sub", text:"Обери практику. Кожна сесія потрапляє в календар."})
  );

  const stats = el("div",{class:"stat-row"}, spinner());
  const grid = el("div",{class:"tile-grid"});
  TILES.forEach(t=>{
    grid.append(
      el("button",{class:`tile ${t.cls}`, onclick:()=>go(t.route)},
        el("span",{class:"tile-glyph"}, ICON[t.icon]()),
        el("span",{class:"tile-text"},
          el("span",{class:"tile-title", text:t.title}),
          el("span",{class:"tile-sub", text:t.sub})
        ),
        el("span",{class:"tile-go"}, ICON.play())
      )
    );
  });

  root.append(head, stats, grid);

  try{
    const since = new Date(); since.setDate(since.getDate()-120);
    const [sessions, pts] = await Promise.all([
      Sessions.list({ from: since.toISOString() }),
      pointsBalance()
    ]);
    const today = todayStr();
    const todays = sessions.filter(s => s.started_at.slice(0,10) === today);
    const secsToday = todays.reduce((s,x)=> s + (x.duration_seconds||0), 0);
    const streak = streakFrom(sessions);
    stats.replaceChildren(
      stat(streak, streak===1?"день поспіль":"днів поспіль", "t-breath"),
      stat(todays.length, "сесій сьогодні", "t-cold"),
      stat(fmtClock(secsToday), "часу сьогодні", "t-freq"),
      stat(pts.balance, "балів", "t-task"),
    );
  }catch(e){
    stats.replaceChildren(el("div",{class:"muted small", text:"Статистика недоступна."}));
  }
}

function stat(value, label, cls){
  return el("div",{class:`stat ${cls}`},
    el("div",{class:"stat-value", text:String(value)}),
    el("div",{class:"stat-label", text:label})
  );
}
