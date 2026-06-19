import { el } from "../ui.js";
import { go } from "../router.js";
import { ICON } from "../icons.js";
import { BREATH_PRACTICES } from "../content.js";

export async function render(root){
  root.append(
    el("header",{class:"page-head"},
      el("p",{class:"eyebrow", text:"Дихання"}),
      el("h1",{class:"page-title", text:"Дихальні практики"}),
      el("p",{class:"page-sub", text:"Обери техніку — кожна веде на свою сторінку з описом і таймером."})
    )
  );

  const grid = el("div",{class:"tile-grid"});
  BREATH_PRACTICES.forEach(p=>{
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
