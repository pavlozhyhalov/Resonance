// ============================================================================
// audio.js — in-app sound. No network needed for synth; YouTube is optional.
// ============================================================================

let ctx = null;
function ac(){
  if(!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if(ctx.state === "suspended") ctx.resume();
  return ctx;
}

// ---- master fade helper ----
function ramp(param, to, t, time=0.4){
  const now = ac().currentTime;
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(to, now + time);
}

// ============================================================================
// Tone engine — one active tone (pure sine or binaural pair).
// ============================================================================
export const Tone = (() => {
  let nodes = null;       // { oscs:[], gain }
  let current = null;     // descriptor
  let volume = 0.4;

  function stop(fade=0.35){
    if(!nodes) return;
    const g = nodes.gain;
    ramp(g.gain, 0, null, fade);
    const dead = nodes;
    setTimeout(() => {
      try{ dead.oscs.forEach(o => o.stop()); }catch(e){}
    }, fade*1000 + 60);
    nodes = null; current = null;
  }

  function play(synth){
    stop(0.15);
    const c = ac();
    const gain = c.createGain();
    gain.gain.value = 0;
    gain.connect(c.destination);
    const oscs = [];

    if(synth.kind === "binaural"){
      // left = carrier, right = carrier + beat
      const merger = c.createChannelMerger(2);
      const oL = c.createOscillator(); oL.type="sine"; oL.frequency.value = synth.carrier;
      const oR = c.createOscillator(); oR.type="sine"; oR.frequency.value = synth.carrier + synth.beat;
      const gL = c.createGain(), gR = c.createGain();
      oL.connect(gL).connect(merger, 0, 0);
      oR.connect(gR).connect(merger, 0, 1);
      merger.connect(gain);
      oL.start(); oR.start();
      oscs.push(oL, oR);
    } else {
      const o = c.createOscillator(); o.type="sine"; o.frequency.value = synth.freq;
      // gentle warmth: slow amplitude shimmer
      const lfo = c.createOscillator(); lfo.frequency.value = 0.15;
      const lfoGain = c.createGain(); lfoGain.gain.value = 0.06;
      lfo.connect(lfoGain).connect(gain.gain);
      o.connect(gain);
      o.start(); lfo.start();
      oscs.push(o, lfo);
    }
    nodes = { oscs, gain };
    current = synth;
    ramp(gain.gain, volume, null, 0.8);
  }

  function setVolume(v){
    volume = v;
    if(nodes) ramp(nodes.gain.gain, v, null, 0.2);
  }
  function isPlaying(){ return !!nodes; }
  return { play, stop, setVolume, isPlaying };
})();

// ============================================================================
// Soundscape engine — looping ambient beds built from filtered noise.
// Used as background for breathing / cold sessions. Independent of Tone.
// ============================================================================
export const Soundscape = (() => {
  let chain = null;
  let volume = 0.5;
  let currentId = "none";

  function noiseBuffer(){
    const c = ac();
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for(let i=0;i<len;i++) d[i] = Math.random()*2 - 1;
    return buf;
  }

  function stop(fade=0.5){
    if(!chain) return;
    ramp(chain.gain.gain, 0, null, fade);
    const dead = chain;
    setTimeout(()=>{ try{ dead.src.stop(); }catch(e){} dead.extra && dead.extra.forEach(n=>{try{n.stop&&n.stop()}catch(e){}}); }, fade*1000+60);
    chain = null; currentId = "none";
  }

  function play(id){
    stop(0.3);
    if(id === "none"){ currentId="none"; return; }
    const c = ac();
    const src = c.createBufferSource();
    src.buffer = noiseBuffer(); src.loop = true;
    const gain = c.createGain(); gain.gain.value = 0;
    const extra = [];

    if(id === "rain"){
      const hp = c.createBiquadFilter(); hp.type="highpass"; hp.frequency.value=800;
      const lp = c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=9000;
      src.connect(hp).connect(lp).connect(gain);
    } else if(id === "ocean"){
      const lp = c.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=550;
      src.connect(lp).connect(gain);
      // slow swell
      const lfo = c.createOscillator(); lfo.frequency.value=0.1;
      const lg = c.createGain(); lg.gain.value=0.35;
      lfo.connect(lg).connect(gain.gain); lfo.start(); extra.push(lfo);
    } else if(id === "wind"){
      const bp = c.createBiquadFilter(); bp.type="bandpass"; bp.frequency.value=500; bp.Q.value=0.6;
      src.connect(bp).connect(gain);
      const lfo = c.createOscillator(); lfo.frequency.value=0.07;
      const lg = c.createGain(); lg.gain.value=300;
      lfo.connect(lg).connect(bp.frequency); lfo.start(); extra.push(lfo);
    } else if(id === "drone"){
      // warm low pad: two detuned sines instead of noise
      src.disconnect && src.disconnect();
      const o1=c.createOscillator(); o1.type="sine"; o1.frequency.value=110;
      const o2=c.createOscillator(); o2.type="sine"; o2.frequency.value=110.5;
      const o3=c.createOscillator(); o3.type="sine"; o3.frequency.value=164.8;
      o1.connect(gain); o2.connect(gain); o3.connect(gain);
      o1.start(); o2.start(); o3.start(); extra.push(o1,o2,o3);
      gain.connect(c.destination);
      ramp(gain.gain, volume*0.5, null, 1.2);
      chain = { src:{stop(){}}, gain, extra }; currentId=id; return;
    } else {
      src.connect(gain);
    }
    gain.connect(c.destination);
    src.start();
    ramp(gain.gain, volume, null, 1.0);
    chain = { src, gain, extra }; currentId = id;
  }

  function setVolume(v){ volume=v; if(chain) ramp(chain.gain.gain, v, null, 0.3); }
  function current(){ return currentId; }
  return { play, stop, setVolume, current };
})();

export const SOUNDSCAPES = [
  { id:"none",  label:"Тиша" },
  { id:"drone", label:"Дрон" },
  { id:"rain",  label:"Дощ" },
  { id:"ocean", label:"Океан" },
  { id:"wind",  label:"Вітер" },
];

// ============================================================================
// Cue blips — short tones for breathing cues (inhale/exhale/round end).
// ============================================================================
export function blip(type="in"){
  const c = ac();
  const o = c.createOscillator(), g = c.createGain();
  o.connect(g).connect(c.destination);
  const f = type==="in" ? 660 : type==="out" ? 440 : type==="end" ? 880 : 550;
  o.frequency.value = f; o.type="sine";
  const now = c.currentTime;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(0.25, now+0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, now+0.25);
  o.start(now); o.stop(now+0.27);
}

// ============================================================================
// YouTube embed — plays inside the page (no navigation away).
// ============================================================================
export function youtubeSearchEmbed(query){
  // listType=search plays the first matching result inside the page.
  const q = encodeURIComponent(query);
  return `https://www.youtube.com/embed?listType=search&list=${q}&autoplay=1&rel=0&modestbranding=1`;
}

export function stopAll(){
  Tone.stop(0.2);
  Soundscape.stop(0.2);
}
