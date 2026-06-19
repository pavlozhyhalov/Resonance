// Hash router. Each route = { theme, render(root) -> optional cleanup fn }.
import { stopAll } from "./audio.js?v=20260619124933";

const routes = {};
let currentCleanup = null;

export function register(path, def){ routes[path] = def; }

function parse(){
  const raw = location.hash.replace(/^#\/?/, "");
  const [path, queryStr] = raw.split("?");
  const params = Object.fromEntries(new URLSearchParams(queryStr || ""));
  return { path: path || "home", params };
}

export async function navigate(){
  const { path, params } = parse();
  const def = routes[path] || routes["home"];

  // leave previous page
  if(typeof currentCleanup === "function"){ try{ currentCleanup(); }catch(e){} }
  currentCleanup = null;
  stopAll(); // never let audio bleed across pages

  // theme
  document.body.dataset.theme = def.theme || "cosmic";

  // active nav
  document.querySelectorAll(".nav-item").forEach(n=>{
    n.classList.toggle("active", n.dataset.route === (def.navKey || path));
  });

  const root = document.getElementById("view");
  root.classList.remove("fade-in"); void root.offsetWidth; root.classList.add("fade-in");
  root.innerHTML = "";
  window.scrollTo(0,0);

  try{
    currentCleanup = await def.render(root, params);
  }catch(err){
    console.error(err);
    root.innerHTML = `<div class="error-card">Не вдалося відкрити сторінку.<br><small>${(err&&err.message)||err}</small></div>`;
  }
}

export function go(path){ location.hash = `#/${path}`; }

export function startRouter(){
  window.addEventListener("hashchange", navigate);
  if(!location.hash) location.hash = "#/home";
  else navigate();
}
