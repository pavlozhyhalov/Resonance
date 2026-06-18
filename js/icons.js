// Monochrome line icons. Each returns an <svg> using currentColor,
// so colour is controlled entirely by CSS (dim by default, accent when active).
const NS = "http://www.w3.org/2000/svg";

function svg(paths, { fill=false }={}){
  const s = document.createElementNS(NS,"svg");
  s.setAttribute("viewBox","0 0 24 24");
  s.setAttribute("class","ic");
  s.setAttribute("fill", fill ? "currentColor" : "none");
  s.setAttribute("stroke", fill ? "none" : "currentColor");
  s.setAttribute("stroke-width","1.7");
  s.setAttribute("stroke-linecap","round");
  s.setAttribute("stroke-linejoin","round");
  s.innerHTML = paths;
  return s;
}

export const ICON = {
  home: () => svg('<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/>'),
  freq: () => svg('<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3"/>'),
  breath: () => svg('<circle cx="12" cy="12" r="8.2"/><path d="M12 3.8v3M12 17.2v3M3.8 12h3M17.2 12h3"/>'),
  cold: () => svg('<path d="M12 2.5v19M3.7 7.2l16.6 9.6M20.3 7.2 3.7 16.8"/><path d="M12 6.2 9.4 4M12 6.2 14.6 4M12 17.8 9.4 20M12 17.8 14.6 20M5.2 9.3 5 6.4M5.2 9.3 2.4 9.7M18.8 14.7l.2 2.9M18.8 14.7l2.8-.4M18.8 9.3l.2-2.9M18.8 9.3l2.8.4M5.2 14.7 5 17.6M5.2 14.7l-2.8-.4"/>'),
  calendar: () => svg('<rect x="3.5" y="5" width="17" height="15.5" rx="2.5"/><path d="M3.5 9.5h17M8 3.5v3M16 3.5v3"/>'),
  tasks: () => svg('<path d="M12 3.2 14.2 9l6 .3-4.7 3.8 1.6 5.8L12 15.6 6.9 18.9l1.6-5.8L3.8 9.3l6-.3z"/>'),

  play: () => svg('<path d="M7 5.5v13l11-6.5z"/>', { fill:true }),
  pause: () => svg('<path d="M7 5h3.2v14H7zM13.8 5H17v14h-3.2z"/>', { fill:true }),
  chart: () => svg('<path d="M4 20V4M4 20h16"/><rect x="7" y="12" width="3" height="5"/><rect x="12" y="8" width="3" height="9"/><rect x="17" y="5" width="3" height="12"/>'),
  close: () => svg('<path d="M6 6l12 12M18 6 6 18"/>'),
};
