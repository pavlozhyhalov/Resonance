# Гендерні форми es / fr / de — доповнення (ролі-іменники)

Дата: 2026-08-24. За ТЗ-доповненням «гендерні форми в es/fr/de».
Кеш-версія після правок: **20260824000003**.

## Підсумок

Автоматичний аудит (Частина C) короткі рольові лейбли «Ти X» не ловив.
Ручна вичитка `SITE-TEXT-AUDIT-es-fr-de.csv` дала 7 місць; систематичний
пошук по трьох патернах підтвердив їх і додав **4 нові** (іспанське
`mismo` — самозвернення в чоловічому роді). Разом **13 правок** у
`i18n/{es,fr,de}.json`. uk/ru/en/pl не чіпалися.

## A. Виправлено — 7 місць із ТЗ (6 правок; fr «власник» безпечний)

| Ключ (uk) | мова | було → стало |
|---|---|---|
| Ти адміністратор | fr | `Tu es administrateur` → **`Rôle : administrateur`** |
| Ти адміністратор | es | `Eres administrador` → **`Rol: administrador`** |
| Ти адміністратор | de | `Du bist Administrator` → **`Rolle: Administrator`** |
| Ти власник | fr | `Tu es le propriétaire` — **без змін** (рід не змінюється) |
| Ти власник | es | `Eres el propietario` → **`Rol: propietario`** |
| Ти власник | de | `Du bist der Besitzer` → **`Rolle: Besitzer`** |
| Поки ти єдиний учасник. | fr | `…tu es le seul participant.` → **`Pour l'instant, aucun autre participant.`** |
| Поки ти єдиний учасник. | es | `…eres el único participante.` → **`Por ahora, no hay más participantes.`** |
| Поки ти єдиний учасник. | de | `…bist du der einzige Teilnehmer.` → **`Bisher bist du allein hier.`** |
| Квадратне дихання… (нервозність) | fr | `…ou quand tu es nerveux.` → **`…ou en cas de nervosité.`** |

Примітки:
- es для «квадратного дихання» вже казало `en momentos de nerviosismo`
  (іменник) — без змін.
- de для «квадратного дихання»: `wenn du nervös bist` — `nervös` предикативний
  прикметник, у німецькій незмінний за родом → безпечно, без змін.

Прийом для «адміністратор/власник» — лейбл-формат «Роль: X» / «Rôle : X» /
«Rolle: X» замість речення «ти є X»; уникає роду взагалі (той самий підхід,
що для pl «Ти в челенджі» → «W wyzwaniu» у Частині A).

## B. Додаткові знахідки поза 7 — виправлено (es `mismo`, самозвернення)

Систематичний пошук виявив ще **4** іспанські рядки з чоловічим `mismo`,
що звертається до користувача (жоден із трьох патернів ТЗ їх не ловить —
`mismo` стоїть не одразу після `eres/estás`):

| Ключ (uk, скорочено) | було → стало (es) |
|---|---|
| Resonance — персональний компаньйон… | `…tú eres tu personaje y mejoras a ti **mismo**, no a un avatar.` → `…tú eres tu personaje y no mejoras un avatar, sino a ti.` |
| HRV індивідуальна… | `…compárate **contigo mismo**, no con otros.` → `…compárate con tu propio historial, no con otros.` |
| Бали: 1 хвилина практики… | `…recompensas que **tú mismo** decidas.` → `…recompensas que decidas tú.` |
| Ти — свій персонаж. Кожна реальна практика… | `…No mejoras un avatar, sino a ti **mismo**.` → `…No mejoras un avatar, sino a ti.` |

## C. Систематичний пошук — результат і хибні спрацювання

Патерни з ТЗ прогнано по всьому корпусу (dict + rsT + вправи + приватність).
Після правок реальних збігів **0**; нижче — хибні спрацювання (НЕ чіпалися).

**FR `\btu es\s+\w+(eur|teur|ien|er|on)\b` — 4 хибні:**
- `Tu es ton personnage` (×4 варіанти) — присвійне «твій персонаж» (RPG-метафора).
  `personnage` має фіксований чоловічий рід у французькій і нікого не
  місгендерить (як «la personne» завжди жіночого) — безпечно.

**ES `\b(eres|estás)\s+(el\s+)?\w+o\b` — після правок 0.** Раніше ловило
`eres administrador` / `eres el propietario` / `eres el único participante`
(виправлено вище). Окремо перевірено `mism[oa]`: `a la misma hora` (узгодж. з
`hora`, ж. р.), `por sí mismo` (про сам звук) — хибні, безпечні.

**DE `\bdu bist\s+(der|die|das)?[A-ZÄÖÜ]\w+\b` — після правок 0.** Рештки
`du bist in der Challenge / im Moment / in der Gemeinschaft` (локатив) і
`du bist dein Charakter / deine Figur` (присвійне) — з малої літери після
`du bist`, під патерн не підпадають і безпечні.

## Чек-лист ТЗ

- [x] 6 із 7 рядків виправлено (fr «власник» — без змін, підтверджено безпечним)
- [x] Систематичний пошук по трьох патернах виконано
- [x] Додаткові знахідки (4 es `mismo`) — виправлено, з точним текстом вище
- [x] Хибні спрацювання — у звіті (не відсіяно мовчки)
