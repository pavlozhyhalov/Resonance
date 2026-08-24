# Гендерні форми es / fr / de — доповнення 2

Дата: 2026-08-24. За ТЗ-доповненням 2. Кеш-версія: **20260824000004**.

## A. Обовʼязкова правка з ТЗ (ex@373004, картка HIIT) — виконано

| мова | було → стало |
|---|---|
| es | `…Cuida la técnica incluso cansado.` → **`…Cuida la técnica incluso con fatiga.`** |
| fr | `…Garde une technique propre même fatigué.` → **`…Garde une technique propre même en cas de fatigue.`** |

de для цього рядка вже було коректним (`auch bei Müdigkeit` — іменник). Правку
внесено в бандл (`app.bundle.js`, інлайн-картка вправи).

## B. Додатково знайдено широким прогоном прикметників — виправлено проактивно

Прогнав по всьому корпусу пошук «дієслово-наказ + прикметник ч. р., що
звертається до користувача». Знайшов ще **9 рядків** тієї самої категорії
(де **de вже нейтральне** через іменник/незмінний прикметник, а es/fr відставали).
Виправлено за тим самим прийомом. Усі — у `i18n/{es,fr}.json`.

| Ключ (uk) | мова | було → стало |
|---|---|---|
| Дихай лише сидячи або лежачи | es | `Practica solo sentado o tumbado` → `…en posición sentada o tumbada` |
| ^ | fr | `…assis ou allongé` → `…en position assise ou allongée` |
| Слухай частоти… розслаблено | es | `…relajado, en calma.` → `…con calma y relajación.` |
| ^ | fr | `…détendu, au repos.` → `…dans le calme et la détente.` |
| Влаштуйся зручно, розслабся | es | `Ponte cómodo, relájate` → `Acomódate y relájate` |
| Кероване розслаблення лежачи… | es | `…guiada tumbado…` → `…guiada en posición tumbada…` |
| ^ | fr | `…guidée allongé…` → `…guidée en position allongée…` |
| NSDR — спокійне лежання… | es | `…es estar tumbado con calma…` → `…es estar en posición tumbada, con calma…` |
| ^ | fr | `…c'est rester allongé calmement…` → `…c'est rester en position allongée, au calme…` |

> (fr «Влаштуйся зручно» вже було безпечним — `confortablement`, прислівник;
> de в усіх цих рядках уже нейтральне.)
> **Це проактивні правки поза буквою ТЗ** — за схемою доповнення 1 (знайти →
> виправити → відзвітувати). Якщо з якимось формулюванням не згоден — відкат
> тривіальний.

## C. Залишено на розсуд (standalone-лейбли, як «Готово»/«Listo»)

Окремі слова-позначки з чоловічою формою, які як лейбли усталені й, найімовірніше,
не проблема (той самий випадок, що ти描ав для «Listo»). НЕ чіпав:

| uk-ключ | es | fr |
|---|---|---|
| Готово | `Listo` | — |
| готово (компакт) | `listo` | `prêt` |
| Зосереджений (фаза дихання) | `Concentrado` | `Concentré` |

Якщо десь у продукті одне з цих слів з'являється в реченні «Ти X» (а не окремим
лейблом) — скажи, виправлю.

## D. Хибні спрацювання (не чіпав)

- es `Mantén … el agarre sea cómodo` / fr `tant que la prise reste confortable` /
  `tant que c'est confortable` — «зручний» стосується хвата/ситуації, не користувача.
- Усі `sistema nervioso / système nerveux`, `corazón tranquilo / cœur…`,
  `Mentor tranquilo / Mentor calme`, `misma hora`, `por sí mismo` — не про стать
  користувача.

## Чек-лист ТЗ

- [x] `ex@373004` виправлено, es і fr обидва
