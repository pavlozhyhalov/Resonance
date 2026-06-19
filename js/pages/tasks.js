import { el, clear, toast, todayStr, confirmModal, modal } from "../ui.js?v=20260619080452";
import { Tasks, Rewards, pointsBalance } from "../store.js?v=20260619080452";

export async function render(root){
  const balanceEl = el("div",{class:"points-pill"}, "…");
  const head = el("header",{class:"page-head"},
    el("div",{class:"row between"},
      el("h1",{class:"page-title", text:"Завдання"}),
      balanceEl
    ),
    el("p",{class:"page-sub", text:"Виконуй звички — отримуй бали — обмінюй на винагороди."})
  );

  const tabBar = el("div",{class:"seg-group wide"});
  const tabTasks = el("button",{class:"seg on", text:"Завдання"});
  const tabRewards = el("button",{class:"seg", text:"Винагороди"});
  tabBar.append(tabTasks, tabRewards);

  const panel = el("div",{class:"task-panel"});
  root.append(head, tabBar, panel);

  let tab = "tasks";
  tabTasks.onclick = ()=>{ tab="tasks"; tabTasks.classList.add("on"); tabRewards.classList.remove("on"); paint(); };
  tabRewards.onclick = ()=>{ tab="rewards"; tabRewards.classList.add("on"); tabTasks.classList.remove("on"); paint(); };

  async function refreshBalance(){
    try{ const p = await pointsBalance(); balanceEl.textContent = `${p.balance} ✦`; balanceEl.dataset.balance = p.balance; }
    catch(e){ balanceEl.textContent = "—"; }
  }

  async function paint(){
    clear(panel);
    panel.append(el("div",{class:"loading", text:"Завантаження…"}));
    await refreshBalance();
    if(tab==="tasks") await paintTasks();
    else await paintRewards();
  }

  async function paintTasks(){
    let tasks, done;
    try{
      const today = todayStr();
      [tasks, done] = await Promise.all([ Tasks.list(), Tasks.completionsOn(today) ]);
    }catch(e){ clear(panel); panel.append(authNote()); return; }
    const doneIds = new Set(done.map(d=>d.task_id));
    clear(panel);

    if(!tasks.length) panel.append(el("div",{class:"empty-hint", text:"Ще немає завдань. Додай перше нижче."}));

    tasks.forEach(t=>{
      const isDone = doneIds.has(t.id);
      panel.append(
        el("div",{class:"task-row"+(isDone?" done":"")},
          el("button",{class:"check"+(isDone?" on":""), onclick:async()=>{
            try{
              if(isDone){ await Tasks.uncomplete(t.id, todayStr()); }
              else { await Tasks.complete(t, todayStr()); toast(`+${t.points} ✦`); }
              paint();
            }catch(e){ toast("Не вийшло","err"); }
          }, text: isDone?"✓":""}),
          el("div",{class:"task-main"},
            el("div",{class:"task-title", text:t.title}),
            el("div",{class:"task-sub", text:`${t.points} балів • ${t.cadence==="daily"?"щодня":"разово"}`})
          ),
          el("button",{class:"task-del", onclick:async()=>{
            if(await confirmModal("Видалити завдання?")){ try{ await Tasks.remove(t.id); paint(); }catch(e){} }
          }, text:"✕"})
        )
      );
    });

    panel.append(el("button",{class:"add-btn", onclick:addTask, text:"+ Додати завдання"}));
  }

  async function paintRewards(){
    let rewards, balance = +(balanceEl.dataset.balance||0);
    try{ rewards = await Rewards.list(); }
    catch(e){ clear(panel); panel.append(authNote()); return; }
    clear(panel);

    const active = rewards.filter(r=>!r.redeemed_at);
    const claimed = rewards.filter(r=>r.redeemed_at);

    if(!active.length) panel.append(el("div",{class:"empty-hint", text:"Додай винагороду — те, чим себе порадуєш."}));

    active.forEach(r=>{
      const can = balance >= r.cost;
      panel.append(
        el("div",{class:"reward-row"},
          el("div",{class:"reward-main"},
            el("div",{class:"task-title", text:r.title}),
            el("div",{class:"task-sub", text:`${r.cost} ✦`})
          ),
          el("button",{class:"btn small "+(can?"primary":"ghost"), disabled: !can, onclick:async()=>{
            if(await confirmModal(`Обміняти на «${r.title}» за ${r.cost} балів?`, {okText:"Обміняти", danger:false})){
              try{ await Rewards.redeem(r.id); toast("Отримано 🎉"); paint(); }catch(e){ toast("Помилка","err"); }
            }
          }, text: can?"Отримати":"Замало"}),
          el("button",{class:"task-del", onclick:async()=>{
            if(await confirmModal("Видалити винагороду?")){ try{ await Rewards.remove(r.id); paint(); }catch(e){} }
          }, text:"✕"})
        )
      );
    });

    panel.append(el("button",{class:"add-btn", onclick:addReward, text:"+ Додати винагороду"}));

    if(claimed.length){
      panel.append(el("div",{class:"section-label", text:"Отримані"}));
      claimed.slice(-10).reverse().forEach(r=>{
        panel.append(el("div",{class:"reward-row claimed"},
          el("div",{class:"reward-main"}, el("div",{class:"task-title", text:r.title})),
          el("span",{class:"claimed-tag", text:"✓"})
        ));
      });
    }
  }

  function addTask(){
    formModal("Нове завдання", [
      { name:"title", label:"Назва", type:"text", placeholder:"напр. Холодний душ зранку" },
      { name:"points", label:"Балів", type:"number", value:10 },
    ], async (vals)=>{
      if(!vals.title) return;
      try{ await Tasks.add({ title:vals.title, points:+vals.points||10, cadence:"daily" }); paint(); }
      catch(e){ toast("Не вдалося","err"); }
    });
  }
  function addReward(){
    formModal("Нова винагорода", [
      { name:"title", label:"Назва", type:"text", placeholder:"напр. Улюблена кава" },
      { name:"cost", label:"Ціна в балах", type:"number", value:100 },
    ], async (vals)=>{
      if(!vals.title) return;
      try{ await Rewards.add({ title:vals.title, cost:+vals.cost||100 }); paint(); }
      catch(e){ toast("Не вдалося","err"); }
    });
  }

  paint();
}

function authNote(){ return el("div",{class:"muted small", text:"Увійди, щоб користуватися завданнями."}); }

function formModal(title, fields, onSubmit){
  const inputs = {};
  const body = el("div",{},
    el("h3",{class:"modal-title", text:title}),
    ...fields.map(f=>{
      const inp = el("input",{class:"input", type:f.type||"text", placeholder:f.placeholder||"", value:f.value!=null?f.value:""});
      inputs[f.name]=inp;
      return el("label",{class:"field"}, el("span",{class:"field-label", text:f.label}), inp);
    }),
    el("div",{class:"modal-actions"},
      el("button",{class:"btn ghost", onclick:()=>m.close(), text:"Скасувати"}),
      el("button",{class:"btn primary", onclick:()=>{ const vals={}; for(const k in inputs) vals[k]=inputs[k].value.trim(); m.close(); onSubmit(vals); }, text:"Додати"})
    )
  );
  const m = modal(body);
  setTimeout(()=> fields[0] && inputs[fields[0].name].focus(), 50);
}
