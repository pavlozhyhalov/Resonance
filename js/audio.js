// ============================================================================
// audio.js — reliable playback for iOS via <audio> media elements.
// Real mp3 files in /audio play through the media channel, so they are NOT
// silenced by the iPhone ring/silent switch (unlike Web Audio).
// ============================================================================

const BASE = "audio/";
let unlocked = false;
const unlockCbs = [];

export function isAudioUnlocked(){ return unlocked; }
export function onAudioUnlock(cb){ if(unlocked) cb(); else unlockCbs.push(cb); }

// Try to make iOS treat us as media playback (ignores mute switch). Safari 16.4+
function setPlaybackSession(){
  try{ if (navigator.audioSession) navigator.audioSession.type = "playback"; }catch(e){}
}

// Call on first user gesture to unlock audio on iOS.
export function unlockAudio(){
  if(unlocked) return;
  unlocked = true;
  setPlaybackSession();
  // prime each channel by playing+pausing within the gesture
  [Main, Bg].forEach(ch => ch._prime());
  [cueIn, cueOut, cueGong].forEach(a => { try{ a.muted=true; a.play().then(()=>{a.pause();a.currentTime=0;a.muted=false;}).catch(()=>{a.muted=false;}); }catch(e){} });
  while(unlockCbs.length){ try{ unlockCbs.shift()(); }catch(e){} }
}

// ---------- a fading audio channel ----------
class Channel {
  constructor(){
    const a = new Audio();
    a.preload = "auto";
    a.crossOrigin = "anonymous";
    a.setAttribute("playsinline","");
    a.loop = true;
    this.a = a;
    this.vol = 0.6;
    this._raf = null;
    this._url = null;
  }
  _prime(){
    const a=this.a;
    if(a.src) return;
    // tiny silent data uri to satisfy gesture unlock
    try{ a.muted=true; a.play().then(()=>{a.pause();a.muted=false;}).catch(()=>{a.muted=false;}); }catch(e){}
  }
  _fade(to, ms=400, cb){
    cancelAnimationFrame(this._raf);
    const from=this.a.volume, t0=performance.now();
    const step=(now)=>{
      const k=Math.min(1,(now-t0)/ms);
      this.a.volume=Math.max(0,Math.min(1,from+(to-from)*k));
      if(k<1) this._raf=requestAnimationFrame(step); else cb&&cb();
    };
    this._raf=requestAnimationFrame(step);
  }
  play(file, { loop=true, vol=null }={}){
    if(vol!=null) this.vol=vol;
    const url = file.startsWith("http") ? file : BASE+file;
    this.a.loop = loop;
    if(this._url !== url){
      this.a.src = url; this._url = url;
    }
    this.a.volume = 0;
    const p = this.a.play();
    if(p&&p.catch) p.catch(()=>{});
    this._fade(this.vol, 500);
  }
  setVolume(v){ this.vol=v; cancelAnimationFrame(this._raf); this.a.volume=v; }
  stop(fade=350){
    this._fade(0, fade, ()=>{ try{ this.a.pause(); this.a.currentTime=0; }catch(e){} this._url=null; });
  }
  isPlaying(){ return this.a && !this.a.paused; }
}

export const Main = new Channel(); // frequency track
export const Bg   = new Channel(); // session background

// ---------- cue sounds (short, independent) ----------
function mk(src){ const a=new Audio(BASE+src); a.preload="auto"; a.setAttribute("playsinline",""); return a; }
const cueIn = mk("cue-in.mp3"), cueOut = mk("cue-out.mp3"), cueGong = mk("cue-gong.mp3");
export function cue(kind){
  const a = kind==="in"?cueIn : kind==="out"?cueOut : cueGong;
  try{ a.currentTime=0; const p=a.play(); if(p&&p.catch)p.catch(()=>{}); }catch(e){}
}
// backward-compat name used elsewhere
export function blip(kind){ cue(kind==="end"?"gong":kind); }

// ---------- soundscapes (built-in ambient files + user tracks) ----------
export const SOUNDSCAPES = [
  { id:"none",  label:"Тиша",  file:null },
  { id:"calm",  label:"Спокій",file:"amb-calm.mp3" },
  { id:"drone", label:"Дрон",  file:"amb-drone.mp3" },
  { id:"rain",  label:"Дощ",   file:"amb-rain.mp3" },
  { id:"ocean", label:"Океан", file:"amb-ocean.mp3" },
  { id:"wind",  label:"Вітер", file:"amb-wind.mp3" },
];

export function playSoundscape(id, vol=0.6){
  const s = SOUNDSCAPES.find(x=>x.id===id);
  if(!s || !s.file){ Bg.stop(300); return; }
  Bg.play(s.file, { loop:true, vol });
}

// ---------- YouTube embed (real music inside the page) ----------
export function youtubeSearchEmbed(query){
  const q = encodeURIComponent(query);
  return `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&rel=0&modestbranding=1&playsinline=1`;
}

export function stopAll(){
  Main.stop(250); Bg.stop(250);
}
