// Frequency catalogue. `synth` describes how the in-app Web Audio engine plays it:
//   kind:"binaural" -> carrier tone in one ear, carrier+beat in the other (needs headphones)
//   kind:"pure"     -> a single steady sine tone at `freq` Hz
// `yt` is a YouTube Music / YouTube search query for the embedded ambient option.
export const FREQUENCIES = [
  { id:"delta", hzLabel:"0.5–4 Hz", name:"Delta", cat:"binaural", status:"researched",
    effects:["sleep"], hz:2.5,
    desc:"Найнижчий діапазон мозкових хвиль. Малі дослідження пов'язують стимуляцію ~3 Гц з глибоким сном і фізичним відновленням.",
    synth:{ kind:"binaural", carrier:200, beat:2.5 },
    yt:"delta waves deep sleep binaural beats" },

  { id:"theta", hzLabel:"4–8 Hz", name:"Theta", cat:"binaural", status:"researched",
    effects:["sleep","relax"], hz:6,
    desc:"Медитативний стан, глибока релаксація, REM-сон. ~6 Гц асоціюють з входженням у медитацію.",
    synth:{ kind:"binaural", carrier:200, beat:6 },
    yt:"theta waves meditation binaural beats" },

  { id:"alpha", hzLabel:"8–12 Hz", name:"Alpha", cat:"binaural", status:"researched",
    effects:["relax","focus"], hz:10,
    desc:"Спокійна зосередженість, знижений стрес, у деяких дослідженнях — більше креативності.",
    synth:{ kind:"binaural", carrier:200, beat:10 },
    yt:"alpha waves focus relax binaural beats" },

  { id:"beta", hzLabel:"12–30 Hz", name:"Beta", cat:"binaural", status:"researched",
    effects:["focus"], hz:18,
    desc:"Активне аналітичне мислення й бадьорість під час роботи чи навчання.",
    synth:{ kind:"binaural", carrier:200, beat:18 },
    yt:"beta waves focus study binaural beats" },

  { id:"gamma", hzLabel:"~40 Hz", name:"Gamma", cat:"binaural", status:"researched",
    effects:["focus","memory"], hz:40,
    desc:"Найкраще досліджений діапазон: невелике дослідження показало покращення пам'яті й концентрації при 40 Гц.",
    synth:{ kind:"binaural", carrier:200, beat:40 },
    yt:"40 Hz gamma focus binaural beats" },

  { id:"f174", hzLabel:"174 Hz", name:"174 Hz", cat:"solfeggio", status:"unverified",
    effects:["physical","relax"], hz:174,
    desc:"Тон Solfeggio. Заявлено як «природний анестетик» — нібито знімає біль і дає відчуття безпеки. Доказів немає.",
    synth:{ kind:"pure", freq:174 }, yt:"174 Hz solfeggio" },

  { id:"f285", hzLabel:"285 Hz", name:"285 Hz", cat:"solfeggio", status:"unverified",
    effects:["physical"], hz:285,
    desc:"Заявлена регенерація тканин і підтримка імунітету. Традиційна інтерпретація без клінічних даних.",
    synth:{ kind:"pure", freq:285 }, yt:"285 Hz solfeggio healing" },

  { id:"f396", hzLabel:"396 Hz", name:"396 Hz", cat:"solfeggio", status:"unverified",
    effects:["emotion"], hz:396,
    desc:"«Частота звільнення» — нібито допомагає відпустити страх і провину. Доказів ефективності немає.",
    synth:{ kind:"pure", freq:396 }, yt:"396 Hz solfeggio" },

  { id:"f417", hzLabel:"417 Hz", name:"417 Hz", cat:"solfeggio", status:"unverified",
    effects:["emotion"], hz:417,
    desc:"«Частота змін» — нібито прибирає негативну енергію. Без наукової бази.",
    synth:{ kind:"pure", freq:417 }, yt:"417 Hz solfeggio" },

  { id:"f528", hzLabel:"528 Hz", name:"528 Hz", cat:"solfeggio", status:"unverified",
    effects:["emotion"], hz:528,
    desc:"Найпопулярніший тон, «частота любові» / «ДНК-репарація». Маркетинговий міф без підтвердженого механізму.",
    synth:{ kind:"pure", freq:528 }, yt:"528 Hz solfeggio" },

  { id:"f639", hzLabel:"639 Hz", name:"639 Hz", cat:"solfeggio", status:"unverified",
    effects:["relationships","emotion"], hz:639,
    desc:"Заявлений зв'язок зі стосунками й комунікацією («серцева чакра»). Без емпіричної перевірки.",
    synth:{ kind:"pure", freq:639 }, yt:"639 Hz solfeggio" },

  { id:"f741", hzLabel:"741 Hz", name:"741 Hz", cat:"solfeggio", status:"unverified",
    effects:["physical"], hz:741,
    desc:"«Детокс-частота» — нібито очищує організм і дає ясність. Наукових даних немає.",
    synth:{ kind:"pure", freq:741 }, yt:"741 Hz solfeggio" },

  { id:"f852", hzLabel:"852 Hz", name:"852 Hz", cat:"solfeggio", status:"unverified",
    effects:["spirit"], hz:852,
    desc:"Заявлений зв'язок з інтуїцією й «духовним порядком». Основа суто езотерична.",
    synth:{ kind:"pure", freq:852 }, yt:"852 Hz solfeggio" },

  { id:"f963", hzLabel:"963 Hz", name:"963 Hz", cat:"solfeggio", status:"unverified",
    effects:["spirit"], hz:963,
    desc:"Найвищий тон, «частота богів»; заявляють активацію шишковидної залози. Без підтверджених механізмів.",
    synth:{ kind:"pure", freq:963 }, yt:"963 Hz solfeggio" },

  { id:"f432", hzLabel:"432 Hz", name:"432 Hz", cat:"other", status:"unverified",
    effects:["tuning"], hz:432,
    desc:"Альтернативний музичний строй замість 440 Гц. У сліпих тестах різниці у впливі не виявляють.",
    synth:{ kind:"pure", freq:432 }, yt:"432 Hz music" },

  { id:"schumann", hzLabel:"7.83 Hz", name:"Резонанс Шумана", cat:"other", status:"unverified",
    effects:["grounding","relax"], hz:7.83,
    desc:"Резонанс електромагнітного поля Землі. Напряму нечутний; тут відтворюється як бінаурал-ритм 7.83 Гц.",
    synth:{ kind:"binaural", carrier:200, beat:7.83 }, yt:"7.83 Hz schumann resonance" },
];

export const EFFECT_LABELS = {
  sleep:"Сон", relax:"Релаксація", focus:"Фокус", memory:"Пам'ять",
  physical:"Тіло", emotion:"Емоції", relationships:"Стосунки",
  spirit:"Духовність", grounding:"Заземлення", tuning:"Строй"
};
export const CAT_LABELS = { binaural:"Бінауральні", solfeggio:"Solfeggio", other:"Інше" };
export const STATUS_LABELS = { researched:"Дослідження є", unverified:"Без доказів" };
