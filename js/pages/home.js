import { el, spinner, fmtClock } from "../ui.js";
import { go } from "../router.js";
import { Sessions, pointsBalance } from "../store.js";
import { todayStr } from "../ui.js";

const TILES = [
  { route:"frequencies", title:"Музика по частотах", sub:"Бінаурал і Solfeggio", glyph:"◎", cls:"t-freq" },
  { route:"wimhof", title:"Дихання Віма Хофа", sub:"Раунди та затримки", glyph:"❂", cls:"t-breath" },
  { route:"cold", title:"Практика холоду", sub:"Душ і крижані ванни", glyph:"❄", cls:"t-cold" },
  { route:"calendar", title:"Календар", sub:"Твоя активність", glyph:"▦", cls:"t-cal" },
  { route:"tasks", title:"Завдання й винагороди", sub:"Бали та цілі", glyph:"✦", cls:"t-task" },
];

function streakFrom(sessions){
  const days = new Set(sessions.map(s => s.started_at.slice(0,10)));
  let streak = 0;
  let d = new Date();
  // if nothing today, streak can still count back from yesterday
  if(!days.has(todayStr(d))) d.setDate(d.getDate()-1);
  for(;;){
    if(days.has(todayStr(d))){ streak++; d.setDate(d.getDate()-1); }
    else break;
  }
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
        el("span",{class:"tile-glyph", text:t.glyph}),
        el("span",{class:"tile-text"},
          el("span",{class:"tile-title", text:t.title}),
          el("span",{class:"tile-sub", text:t.sub})
        ),
        el("span",{class:"tile-go", text:"→"})
      )
    );
  });

  root.append(head, stats, grid);

  // load stats
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
