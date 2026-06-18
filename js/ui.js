// Tiny DOM + format helpers used across pages.

export function el(tag, attrs={}, ...children){
  const n = document.createElement(tag);
  for(const [k,v] of Object.entries(attrs)){
    if(k === "class") n.className = v;
    else if(k === "html") n.innerHTML = v;
    else if(k === "text") n.textContent = v;
    else if(k.startsWith("on") && typeof v === "function") n.addEventListener(k.slice(2), v);
    else if(v === true) n.setAttribute(k, "");
    else if(v !== false && v != null) n.setAttribute(k, v);
  }
  for(const c of children.flat()){
    if(c == null || c === false) continue;
    n.append(c.nodeType ? c : document.createTextNode(c));
  }
  return n;
}

export function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); return node; }

export function fmtTime(totalSeconds){
  totalSeconds = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(totalSeconds/60), s = totalSeconds%60;
  return `${m}:${String(s).padStart(2,"0")}`;
}

export function fmtClock(secs){ // h:mm:ss when long
  secs = Math.max(0, Math.round(secs));
  const h=Math.floor(secs/3600), m=Math.floor((secs%3600)/60), s=secs%60;
  return h ? `${h}:${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}` : fmtTime(secs);
}

export function todayStr(d=new Date()){
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

export function dayName(d){ return ["Нд","Пн","Вт","Ср","Чт","Пт","Сб"][d.getDay()]; }
export const MONTHS = ["Січень","Лютий","Березень","Квітень","Травень","Червень",
  "Липень","Серпень","Вересень","Жовтень","Листопад","Грудень"];

let toastTimer = null;
export function toast(msg, kind="ok"){
  let t = document.getElementById("toast");
  if(!t){ t = el("div",{id:"toast"}); document.body.append(t); }
  t.textContent = msg;
  t.className = `toast show ${kind}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.className = "toast", 2600);
}

export function modal(contentNode){
  const overlay = el("div",{class:"modal-overlay", onclick:(e)=>{ if(e.target===overlay) close(); }});
  const box = el("div",{class:"modal-box"}, contentNode);
  overlay.append(box);
  document.body.append(overlay);
  requestAnimationFrame(()=> overlay.classList.add("show"));
  function close(){ overlay.classList.remove("show"); setTimeout(()=>overlay.remove(),200); }
  return { close, overlay };
}

export function confirmModal(message, { okText="Видалити", danger=true }={}){
  return new Promise(resolve=>{
    const body = el("div",{},
      el("p",{class:"modal-msg", text:message}),
      el("div",{class:"modal-actions"},
        el("button",{class:"btn ghost", onclick:()=>{ m.close(); resolve(false); }, text:"Скасувати"}),
        el("button",{class:`btn ${danger?"danger":"primary"}`, onclick:()=>{ m.close(); resolve(true); }, text:okText}),
      )
    );
    const m = modal(body);
  });
}

export function spinner(){ return el("div",{class:"spinner"}); }
