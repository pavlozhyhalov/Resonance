import { el } from "../ui.js?v=20260619124933";
import { go } from "../router.js?v=20260619124933";
import { ICON } from "../icons.js?v=20260619124933";

const PRACTICES = [
  { route:"wimhof",            title:"Метод Віма Хофа",    tagline:"Енергія, стійкість до холоду, фокус" },
  { route:"pattern?type=box",  title:"Квадратне дихання",  tagline:"Спокій і концентрація під тиском" },
  { route:"pattern?type=r478", title:"Дихання 4-7-8",      tagline:"Засинання та зняття тривоги" },
  { route:"pattern?type=coherent", title:"Когерентне дихання", tagline:"Баланс, рівний пульс (HRV)" },
];

export async function render(root){
  root.append(
    el("header",{class:"page-head"},
      el("p",{class:"eyebrow", text:"Дихання"}),
      el("h1",{class:"page-title", text:"Дихальні практики"}),
      el("p",{class:"page-sub", text:"Обери техніку — кожна веде на свою сторінку з описом і таймером."})
    )
  );
  const grid = el("div",{class:"tile-grid"});
  PRACTICES.forEach(p=>{
    grid.append(
      el("button",{class:"tile t-breath", onclick:()=>go(p.route)},
        el("span",{class:"tile-glyph"}, ICON.breath()),
        el("span",{class:"tile-text"},
          el("span",{class:"tile-title", text:p.title}),
          el("span",{class:"tile-sub", text:p.tagline})
        ),
        el("span",{class:"tile-go"}, ICON.play())
      )
    );
  });
  root.append(grid);
}
