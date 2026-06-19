import { el, toast, modal } from "../ui.js?v=20260619124933";
import { go } from "../router.js?v=20260619124933";
import { FREQUENCIES, CAT_LABELS, STATUS_LABELS } from "../data.js?v=20260619124933";
import { youtubeMusicSearch } from "../audio.js?v=20260619124933";
import { Sessions } from "../store.js?v=20260619124933";

const TONE_SUFFIX = [["Основний трек",""],["Для медитації","meditation"],["Для сну","sleep music"],["Зцілювальна музика","healing"],["Звуки природи","nature sounds"]];
const WAVE_SUFFIX = [["Основний трек",""],["Музика","music"],["Для медитації","meditation"],["Для сну","sleep"],["8 годин (фон)","8 hours"]];
function buildLinks(base, kind){
  const suf = kind==="wave" ? WAVE_SUFFIX : TONE_SUFFIX;
  return suf.map(([label,s])=>({ label, url: youtubeMusicSearch((base+" "+s).trim()) }));
}
const FREQ_CONTENT = {
  delta:{ kind:"wave", base:"Delta Waves Sleep", what:"Найповільніші мозкові хвилі (0.5–4 Гц), що домінують у глибокому сні без сновидінь.", body:"Глибокий дельта-сон — це коли тіло найактивніше відновлюється: росте мʼязова тканина, працює імунітет, консолідується памʼять. Слухають перед сном, щоб швидше засинати й спати глибше.", note:"Бінаурал-ритми мають попередню наукову підтримку, ефект індивідуальний. Потрібні навушники." },
  theta:{ kind:"wave", base:"Theta Waves Meditation", what:"Хвилі 4–8 Гц — стан глибокої релаксації, дрімоти, медитації та фази сну зі сновидіннями.", body:"Тета-стан — це межа між сном і неспанням: розслаблення, інтуїція, творчі осяяння, зняття стресу. Допомагає легше входити в медитацію та відпускати напругу.", note:"Попередні дослідження є; сприйняття індивідуальне. Краще в навушниках." },
  alpha:{ kind:"wave", base:"Alpha Waves Relax", what:"Хвилі 8–12 Гц — спокійне, але уважне неспання.", body:"Альфа зʼявляється, коли ти розслаблений і водночас зосереджений. Знижує тривогу, покращує настрій, навчання й творчість. Добре для перерв у роботі та легкої медитації.", note:"Є попередня база. Ефект мʼякший за тета/дельта." },
  beta:{ kind:"wave", base:"Beta Waves Focus", what:"Хвилі 12–30 Гц — активне мислення, концентрація, пильність.", body:"Бета домінує під час роботи, аналізу й розвʼязання задач. Допомагає зібратися та тримати фокус, коли треба бути продуктивним і бадьорим.", note:"Для роботи/навчання. Не варто слухати перед сном." },
  gamma:{ kind:"wave", base:"40 Hz Gamma Focus", what:"Найшвидші хвилі (~40 Гц), повʼязані з піковою увагою й обробкою інформації.", body:"40 Гц повʼязують із памʼяттю, концентрацією та ясністю мислення — це найкраще досліджений діапазон серед бінаурал-ритмів. Слухають для глибокої розумової роботи.", note:"Має відносно найкращу наукову підтримку серед усіх тут." },
  schumann:{ kind:"wave", base:"7.83 Hz Schumann Resonance", what:"Резонанс електромагнітного поля Землі (≈7.83 Гц), на межі альфа/тета.", body:"Прихильники називають його «заземлювальним» — таким, що допомагає розслабитися й синхронізуватися з природним ритмом планети. Корисний для спокою та м'якої медитації.", note:"Сам по собі нечутний; відтворюється як бінаурал-ритм. Доказів специфічного впливу немає." },
  f174:{ kind:"tone", base:"174 Hz", what:"Найнижчий тон шкали Solfeggio.", body:"Традиційно вважається «природним знеболювачем»: нібито знімає фізичну й емоційну напругу, дає відчуття безпеки та опори. Підходить для заземлення перед сном.", note:"Наукових доказів специфічного впливу немає. Але спокійна музика й усвідомлене слухання самі по собі розслабляють." },
  f285:{ kind:"tone", base:"285 Hz", what:"Solfeggio-тон, повʼязаний із відновленням.", body:"За традицією — підтримує регенерацію тканин та відчуття цілісності тіла. Використовують як фон для відпочинку й відновлення.", note:"Клінічних доказів немає — це практика наміру, а не медицина." },
  f396:{ kind:"tone", base:"396 Hz", what:"«Частота звільнення».", body:"Традиційно асоціюється зі звільненням від страху й провини, перетворенням тривоги на спокій. Слухають під час роботи з емоціями та рефлексії.", note:"Наукових підтверджень немає; цінність — у налаштуванні уваги." },
  f417:{ kind:"tone", base:"417 Hz", what:"«Частота змін».", body:"За традицією допомагає відпустити негатив і запустити позитивні зміни, очистити підсвідомі блоки. Використовують як підтримку при новому старті.", note:"Без наукової бази." },
  f528:{ kind:"tone", base:"528 Hz", what:"Найпопулярніший тон Solfeggio, «частота любові».", body:"Йому приписують гармонізацію, зменшення стресу й навіть «відновлення ДНК». Найчастіше використовують для медитації, вдячності та спокою.", note:"«Ремонт ДНК» — маркетинговий міф без підтвердженого механізму. Як медитативна музика — приємний і робочий." },
  f639:{ kind:"tone", base:"639 Hz", what:"Тон, повʼязаний зі стосунками.", body:"Традиційно — про гармонію у відносинах, комунікацію, емпатію та примирення («серцева чакра»). Слухають, налаштовуючись на тепло до людей.", note:"Емпіричних доказів немає." },
  f741:{ kind:"tone", base:"741 Hz", what:"«Частота очищення».", body:"За традицією — детокс, ясність думок, самовираження й розвʼязання проблем. Використовують для прояснення розуму.", note:"Наукових даних немає." },
  f852:{ kind:"tone", base:"852 Hz", what:"Тон інтуїції.", body:"Асоціюється з поверненням до внутрішнього чуття, спокоєм і духовним порядком. Слухають для зосередження всередину.", note:"Суто езотерична основа." },
  f963:{ kind:"tone", base:"963 Hz", what:"Найвищий тон Solfeggio, «частота пробудження».", body:"Йому приписують зв'язок із інтуїцією та відчуттям єдності, активацію «шишковидної залози». Для глибокої медитації й тиші розуму.", note:"Без підтверджених механізмів." },
  f432:{ kind:"tone", base:"432 Hz music", what:"Альтернативний музичний строй (замість стандартних 440 Гц).", body:"Багато хто описує музику в 432 Гц як «теплішу» й мʼякшу для слуху. Приємний фон для розслаблення й роботи.", note:"У сліпих тестах різниці у впливі не знаходять — але як музика звучить добре." },
};
function freqLinks(id){ const c=FREQ_CONTENT[id]; return c?buildLinks(c.base,c.kind):[]; }

export async function render(root, params){
  const f = FREQUENCIES.find(x=>x.id===(params&&params.id));
  if(!f){ root.append(el("div",{class:"error-card", text:"Частоту не знайдено."})); return; }
  const c = FREQ_CONTENT[f.id] || {};
  const links = freqLinks(f.id);

  root.append(
    el("div",{class:"detail-head"},
      el("button",{class:"back-btn", onclick:()=>go("frequencies"), text:"← Частоти"}),
      el("div",{class:"detail-hz", text:f.hzLabel}),
      el("h1",{class:"detail-title", text:f.name}),
      el("div",{class:"detail-tags"},
        el("span",{class:"detail-tag", text:CAT_LABELS[f.cat]}),
        el("span",{class:`freq-badge ${f.status}`, text:STATUS_LABELS[f.status]})
      )
    ),

    el("div",{class:"info-card"},
      c.what ? el("p",{class:"info-lead", text:c.what}) : null,
      c.body ? el("p",{class:"info-text", text:c.body}) : el("p",{class:"info-text", text:f.desc}),
      c.note ? el("div",{class:"info-note"}, el("span",{class:"info-note-ic", text:"ℹ︎"}), el("span",{text:c.note})) : null,
      f.synth && f.synth.kind==="binaural" ? el("div",{class:"info-note headphones"}, el("span",{class:"info-note-ic", text:"🎧"}), el("span",{text:"Бінаурал-ритм — слухай у навушниках, інакше ефекту не буде."}) ) : null
    ),

    el("div",{class:"section-label", text:"Слухати в YouTube Music"}),
    el("div",{class:"link-list"},
      ...links.map(l=> el("a",{class:"yt-link", href:l.url, target:"_blank", rel:"noopener"},
        el("span",{class:"yt-link-label", text:l.label}),
        el("span",{class:"yt-link-go", text:"▶"})
      ))
    ),

    el("button",{class:"add-btn", onclick:()=>logSheet(f), text:"✓ Відмітити прослуховування"})
  );
}

function logSheet(f){
  const pick=(min)=>async()=>{
    try{ await Sessions.add({ type:"frequency", duration_seconds:min*60, details:{ id:f.id, name:f.name, hz:f.hz, source:"youtube" } });
      toast(`Записано: ${f.name} • ${min} хв`);
    }catch(e){ toast("Не вдалося (увійди)","err"); }
    m.close();
  };
  const body = el("div",{},
    el("h3",{class:"modal-title", text:`Відмітити: ${f.name}`}),
    el("p",{class:"modal-msg", text:"Скільки хвилин слухав? (1 хв = 1 бал)"}),
    el("div",{class:"row gap", style:"flex-wrap:wrap"},
      el("button",{class:"btn ghost", onclick:pick(5)}, "5 хв"),
      el("button",{class:"btn ghost", onclick:pick(15)}, "15 хв"),
      el("button",{class:"btn ghost", onclick:pick(30)}, "30 хв"),
      el("button",{class:"btn primary", onclick:()=>{ const v=parseInt(prompt("Хвилин?","20"),10); if(v>0) pick(v)(); }}, "Інше")
    )
  );
  const m = modal(body);
}
