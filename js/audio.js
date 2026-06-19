// ============================================================================
// audio.js — only short timing cues for breathing. Music comes from the
// YouTube Music app via deep links (opens the native app on the right track).
// ============================================================================

import { ASSET_VER } from "./config.js?v=20260619124933";

const BASE = "audio/";
let unlocked = false;
const unlockCbs = [];

export function isAudioUnlocked(){ return unlocked; }
export function onAudioUnlock(cb){ if(unlocked) cb(); else unlockCbs.push(cb); }

function setPlaybackSession(){
  // "ambient" lets our short cues MIX with background audio (e.g. YouTube Music)
  // instead of interrupting it. Note: silenced by the hardware mute switch.
  try{ if (navigator.audioSession) navigator.audioSession.type = "ambient"; }catch(e){}
}

export function unlockAudio(){
  if(unlocked) return;
  unlocked = true;
  setPlaybackSession();
  [cueIn, cueOut, cueGong].forEach(a => {
    try{ a.muted=true; a.play().then(()=>{a.pause();a.currentTime=0;a.muted=false;}).catch(()=>{a.muted=false;}); }catch(e){}
  });
  while(unlockCbs.length){ try{ unlockCbs.shift()(); }catch(e){} }
}

// ---------- timing cues ----------
function mk(src){ const a=new Audio(BASE+src+"?v="+ASSET_VER); a.preload="auto"; a.setAttribute("playsinline",""); return a; }
const cueIn = mk("cue-in.mp3"), cueOut = mk("cue-out.mp3"), cueGong = mk("cue-gong.mp3");
export function cue(kind){
  const a = kind==="in"?cueIn : kind==="out"?cueOut : cueGong;
  try{ a.currentTime=0; const p=a.play(); if(p&&p.catch)p.catch(()=>{}); }catch(e){}
}
export function blip(kind){ cue(kind==="end"?"gong":kind); }

// ---------- YouTube Music deep link ----------
// Opens the YouTube Music app (iOS universal link) at search results for the
// query — always available, never "video unavailable".
export function youtubeMusicSearch(query){
  return "https://music.youtube.com/search?q=" + encodeURIComponent(query);
}

export function stopAll(){ /* no in-app music to stop */ }
