# App Store — чернетка лістингу + план скріншотів

> Чернетка матеріалів для App Store Connect (Крок 4). Ціна й модель уже зафіксовані
> (6.99€/міс · 44.99€/рік · 14-денний тріал → жорсткий блок нового прогресу).
> Категорія: **Health & Fitness**. Мови лістингу: uk (основна) / ru / en / pl.
>
> Це **чернетка на затвердження** — можна доопрацьовувати текст без Mac/акаунта.
> Вписувати в App Store Connect зможе тільки власник акаунта (Крок 4/5, вересень).
>
> ⚠️ **Правила Apple щодо тексту лістингу:**
> - У **назві/підзаголовку/описі не згадувати ціну** й слово «безкоштовно» — Apple
>   не любить цінового шуму в метаданих; ціна показується автоматично.
> - Не обіцяти лікування/медичних результатів (це Health & Fitness, не Medical) —
>   формулювання про «добробут», «спокій», «звички», не про «лікує тривогу».
> - Keywords: до **100 символів**, через кому, без пробілів після ком, не повторювати
>   слова з назви (вони й так індексуються), не використовувати чужі бренди.

---

## Ліміти символів (App Store Connect)

| Поле | Ліміт | Примітка |
|---|---|---|
| App Name | 30 | індексується в пошуку |
| Subtitle | 30 | індексується в пошуку |
| Keywords | 100 | через кому, без пробілів |
| Promotional Text | 170 | можна міняти без релізу |
| Description | 4000 | перші 2–3 рядки найважливіші |

---

## Назва (App Name, ≤30)

Базова назва бренду — **Resonance**. Щоб виграти в ASO, додаємо короткий дескриптор
у межах 30 символів (різний за мовою, бо індексується).

| Мова | Варіант (символів) |
|---|---|
| uk | `Resonance: саморозвиток` (23) |
| ru | `Resonance: саморазвитие` (23) |
| en | `Resonance: Self Growth` (22) |
| pl | `Resonance: rozwój osobisty` (26) |

*Запасний, максимально короткий:* просто `Resonance` (9) — якщо власник захоче чистий бренд.

## Підзаголовок (Subtitle, ≤30)

| Мова | Варіант (символів) |
|---|---|
| uk | `Звички як гра з рівнями` (23) |
| ru | `Привычки как игра с уровнями` (28) |
| en | `Habits as an RPG you level up` (29) |
| pl | `Nawyki jak gra z poziomami` (26) |

## Keywords (≤100, через кому без пробілів)

Не дублюють слова з назви/підзаголовка. Побудовані навколо: дихання, холод, звички,
серії, саморозвиток, спокій, медитація, трекер, кардіо, сила.

- **uk:** `дихання,холод,загартування,медитація,спокій,трекер звичок,серія,мотивація,вправи,сон,антистрес` (94)
- **ru:** `дыхание,холод,закаливание,медитация,спокойствие,трекер,серия,мотивация,упражнения,сон,антистресс` (96)
- **en:** `breathing,cold,breathwork,meditation,calm,tracker,streak,motivation,workout,sleep,mindfulness` (93)
- **pl:** `oddech,zimno,morsowanie,medytacja,spokój,nawyki,seria,motywacja,ćwiczenia,sen,uważność,rozwój` (93)

> Усі рядки ≤100 **символів** (не байтів — кирилиця це 2 байти, тому рахувати саме
> символи). Перевірка: `python3 -c "print(len('…'))"`. Дублікати слів із назви/
> підзаголовка навмисно прибрані (вони й так індексуються): звідси коротші рядки,
> ніж могли б бути. Є вільний запас — за бажання можна додати ще 1 термін на мову.
>
> **Правки 2026-08-23:** en — `wim hof` замінено на `breathwork` (загальний
> високоінтентний термін замість імені персони). Повний рядок із `gamified` =
> 102 символи (перевищення), тож прибрано останнє слово `gamified` → **93 символи**
> (`sleep` збережено). **Пробіли всередині фраз:** `трекер звичок` (uk) має
> внутрішній пробіл — це не порушує ліміт (94) і не ламає парсинг Apple (кома —
> єдиний розділювач), тож лишено без змін.

## Promotional Text (≤170, можна міняти без релізу)

| Мова | Текст |
|---|---|
| uk | Прокачуй себе, як персонажа: дихання, холод, звички й вправи стають рівнями, серіями та званнями. Твій прогрес — у грі. |
| ru | Прокачивай себя, как персонажа: дыхание, холод, привычки и упражнения становятся уровнями, сериями и званиями. Твой прогресс — в игре. |
| en | Level yourself up like a character: breathing, cold, habits and workouts turn into levels, streaks and titles. Your progress, gamified. |
| pl | Rozwijaj się jak postać: oddech, zimno, nawyki i ćwiczenia stają się poziomami, seriami i tytułami. Twój postęp w formie gry. |

> **Довжина (перевірено 2026-08-23, ліміт 170):** uk 119 · ru 134 · en 135 · pl 125
> (pl оновлено після «Rozwijaj siebie» → «Rozwijaj się»). Усі в межах — скорочення
> не потрібне.

---

## Опис (Description, ≤4000) — uk (база)

```
Знаєш це відчуття: почав нову звичку з ентузіазмом — і за тиждень про неї
забув? Resonance тримає тебе в грі. Замість списку провалів — персонаж,
який росте з кожною практикою.

ЩО ВСЕРЕДИНІ
• Практики: дихання (Вім Хоф, квадратне 4-4-4-4, 4-7-8, когерентне), холодний
  душ і крижана ванна, статичні утримання, антистрес, звукові частоти для
  розслаблення.
• Вправи: статичні, кардіо й силові — з обліком часу й прогресом.
• Звички: чисто · оступ · зрив. Один випадковий оступ не обнуляє серію одразу —
  лише коли назбирається до твого ліміту.
• Цілі з автопрогресом і дедлайнами.
• Система розвитку: рівні від найдовшої серії, гілки навичок, звання, клас
  персонажа за балансом Тіло/Розум.
• Оцінка дня (ранок/обід/вечір) і графік настрою.
• AI-наставник — персональна AI-персона, що підказує вчасно.

ПРИВАТНІСТЬ
Дані зберігаються в ЄС, кожен бачить лише своє. Видалення акаунта й
вивантаження своїх даних — прямо в застосунку. Без реклами й продажу даних.

МОВИ
Українська, російська, англійська, польська — усе, включно з підказками AI.

Спробуй 14 днів повного доступу — і подивись, яким стане твій перший рівень.
```

### Опис — ru

```
Знакомое чувство: начал новую привычку с воодушевлением — и через неделю
забыл о ней? Resonance держит тебя в игре. Вместо списка провалов —
персонаж, который растёт с каждой практикой.

ЧТО ВНУТРИ
• Практики: дыхание (Вим Хоф, квадратное 4-4-4-4, 4-7-8, когерентное), холодный
  душ и ледяная ванна, статические удержания, антистресс, звуковые частоты
  для расслабления.
• Упражнения: статические, кардио и силовые — с учётом времени и прогрессом.
• Привычки: чисто · осечка · срыв. Одна случайная осечка не обнуляет серию сразу —
  только когда наберётся до твоего лимита.
• Цели с автопрогрессом и дедлайнами.
• Система развития: уровни от самой длинной серии, ветки навыков, звания,
  класс персонажа по балансу Тело/Разум.
• Оценка дня (утро/полдень/вечер) и график настроения.
• AI-наставник — персональная AI-персона, подсказывает вовремя.

ПРИВАТНОСТЬ
Данные хранятся в ЕС, каждый видит только своё. Удаление аккаунта и
выгрузка своих данных — прямо в приложении. Без рекламы и продажи данных.

ЯЗЫКИ
Украинский, русский, английский, польский — всё, включая подсказки AI.

Попробуй 14 дней полного доступа — и посмотри, каким станет твой первый
уровень.
```

### Опис — en

```
Know that feeling — you start a new habit with excitement, and a week later
it's gone? Resonance keeps you in the game. Instead of a list of failures,
you get a character that grows with every practice.

WHAT'S INSIDE
• Practices: breathing (Wim Hof, box 4-4-4-4, 4-7-8, coherent), cold shower
  and ice bath, static holds, anti-stress, frequency-based relaxation sounds.
• Exercises: static, cardio and strength — with time tracking and progress.
• Habits: clean · slip · relapse. A random slip won't reset your streak right
  away — only once it reaches your limit.
• Goals with auto-progress and deadlines.
• Progression system: levels from your longest streak, skill branches, titles,
  a character class based on your Body/Mind balance.
• Day ratings (morning/noon/evening) and a mood chart.
• AI mentor — a personal AI persona that nudges you at the right moment.

PRIVACY
Data is stored in the EU, everyone sees only their own data. Account deletion
and export of your data — right inside the app. No ads, no data selling.

LANGUAGES
Ukrainian, Russian, English, Polish — everything, including AI hints.

Try 14 days of full access — and see what your first level looks like.
```

### Опис — pl

```
Znasz to uczucie? Zaczynasz nowy nawyk z entuzjazmem, a po tygodniu o nim
zapominasz. Resonance trzyma cię w grze. Zamiast listy porażek — postać,
która rośnie z każdą praktyką.

CO W ŚRODKU
• Praktyki: techniki oddechowe (Wim Hof, oddech pudełkowy 4-4-4-4, 4-7-8, koherentny),
  zimny prysznic i lodowa kąpiel, izometryczne utrzymania pozycji, antystres,
  muzyka oparta na częstotliwościach.
• Ćwiczenia: statyczne, cardio i siłowe — z pomiarem czasu i postępem.
• Nawyki: czysto · potknięcie · nawrót. Przypadkowe potknięcie nie zeruje serii
  od razu — dopiero gdy nazbiera się do twojego limitu.
• Cele z automatycznym postępem i terminami.
• System rozwoju: poziomy z najdłuższej serii, gałęzie umiejętności, tytuły,
  klasa postaci na podstawie balansu Ciało/Umysł.
• Ocena dnia (rano/południe/wieczór) i wykres nastroju.
• Mentor AI — osobista persona AI, która podpowiada we właściwym momencie.

PRYWATNOŚĆ
Dane przechowywane w UE, każdy widzi tylko swoje. Usunięcie konta i eksport
swoich danych — wprost w aplikacji. Bez reklam i sprzedaży danych.

JĘZYKI
Ukraiński, rosyjski, angielski, polski — wszystko, łącznie z podpowiedziami AI.

Wypróbuj 14 dni pełnego dostępu — i zobacz, jaki będzie twój pierwszy poziom.
```

---

## План скріншотів (6.7" — iPhone 15/16 Pro Max, 1290×2796)

Apple вимагає щонайменше комплект 6.7". Рекомендовано **6 кадрів**, кожен із коротким
підписом-оверлеєм (caption) угорі. Захоплювати з реального застосунку в демо-режимі
(без реєстрації → чисті, презентабельні дані, жодних PII на скріншоті).

| # | Екран | Що показати | Підпис-оверлей (uk / en) |
|---|---|---|---|
| 1 | Home / персонаж | Рівень, серія, клас, гілки навичок — «герой» | «Прокачуй себе, як персонажа» / «Level yourself up like a character» |
| 2 | Практики | Список практик (дихання, холод, вправи) | «Практики, що дають результат» / «Practices that build you» |
| 3 | Дихальна практика | Живий кружок вдиху/видиху в процесі | «Дихай усвідомлено» / «Breathe with intention» |
| 4 | Календар / серії | Зелені дні, серія, нейтральні пропуски | «Твоя серія — твій рушій» / «Your streak drives you» |
| 5 | Аналітика | Графік настрою + тренд | «Бачиш свою динаміку» / «See your trends» |
| 6 | AI-наставник | Чат із персоною (демо-відповідь) | «Персональний AI-наставник» / «A personal AI mentor» |

**Технічні нотатки для захоплення (Крок 4/5, коли зʼявиться Mac/симулятор):**
- Знімати в **демо-режимі** (`window.__rsDemo`) — дані вже гарні, нуль PII, нуль
  витрат на Gemini.
- Обидві теми доступні; для App Store обрати **одну** послідовну (рекомендація —
  темна для кадрів 1–3, або витримати всі в одній). Головне — консистентність.
- Локалізовані скріншоти опційні: якщо робити локалізацію лише текстом лістингу, а
  скріншоти лишити англ/укр — це припустимо. Ідеально — комплект на мову інтерфейсу.
- 1024×1024 іконку для App Store взяти з `icons/` (перевірити, що є без прозорості
  й без заокруглень — Apple заокруглює сам).

---

## Інші поля App Store Connect (довідково, Крок 4)

- **Support URL:** сторінка контакту/підтримки (напр. youresonance.com або /privacy).
- **Marketing URL (опц.):** youresonance.com.
- **Privacy Policy URL:** `youresonance.com/#/privacy` (сторінка вже є, 4 мови).
- **Age Rating:** ймовірно 4+ (немає жорсткого контенту); анкету заповнити чесно.
- **Export Compliance:** використовується лише стандартний HTTPS → зазвичай «exempt».
- **App Privacy:** заповнити за мапою в `docs/HANDOFF-iOS.md` (звірено з Umami).

**Статус:** чернетка на затвердження. Текст можна шліфувати вже зараз; занесення в
App Store Connect — за власником акаунта у вересні.
