# Шаги 4–5. Метарепозиторий продукта и OpenSpec Store

Метарепозиторий продукта с OpenSpec Store: аналитик в личном fork готовит Change по запросу лимита суммы кредита. Это шаги 4–5 маршрута курса, после шага 3 «Изменение в OpenSpec»; реализация кода сюда не входит.

| | |
| --- | --- |
| Шаг курса | [Шаг 4. Команда продукта](https://apolenkov.github.io/customdev-learning/guides/s4-team.html) и [шаг 5. Контекст продукта](https://apolenkov.github.io/customdev-learning/guides/s4-product.html) |
| Вход | учебная база — ветка `course/<LOGIN>/stage-4-import-base`, которую готовит организатор; без организатора — опубликованная `course/example/stage-4-import-base` из этого репозитория: вы получаете её из своего fork, сверяете SHA с исходным репозиторием курса и сами создаёте из неё личную базу `course/your_login/stage-4-import-base` |
| Действие | в личной ветке от базы аналитик готовит Change в `openspec/`, сверяясь с read-only снимками в `.workspace/` |
| Результат | PR с Change в своём fork метарепозитория, одобренный владельцем продукта; архитектор приглашён через @, потому что изменение затрагивает интеграцию с системой банка |

**С чего начать.** На GitHub нажмите **Fork**. Учебная база — не `main`, поэтому снимите флажок **Copy the main branch only**. Если вы работаете в GitLab, создайте проект через **New project → Import project → Repository by URL** и вставьте адрес `https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git`. Дальше порядок зависит от того, есть ли у вас организатор: раздел 1 описывает оба маршрута.

```text
личный Git SHA согласованного planning source
              │ организатор переносит весь набор планирования
              ▼
personal import-base в product-meta ── публикация ветки
              │ ученик копирует все ветки в fork и клонирует свой fork
              ▼
sdd-guide-credit-calculator-stage-4-requirements/
├── openspec/                         единственное место изменения требований
├── .workspace/planning/stage-3/      source provenance, только чтение
└── .workspace/services/...           контекст сервиса, только чтение
```

## Комплект и закреплённые версии

Аналитик работает в личном fork метарепозитория, а два закреплённых снимка в `.workspace/` использует только для проверки.

Для будущей реализации готовый комплект для практикума разработки состоит из двух соседних рабочих папок:

- `sdd-guide-credit-calculator-stage-4-requirements/` — требования, планы Changes и задачи в `openspec/`.
- `sdd-guide-credit-calculator-stage-4-code/` — код в `src/` и тесты в `test/`.

В папке кода `openspec/config.yaml` уже содержит указатель на Store `sdd-credit-calculator-product-meta`. Местных `openspec/specs/` и `openspec/changes/` там нет: для нового комплекта не нужно переносить или удалять старые требования. Указатель не клонирует product-meta и не регистрирует Store.

Project skill подготовки создаёт отдельный соседний checkout кода на точном service
pin, но не создаёт в нём ветку разработки и не разрешает реализацию. Существующие
личные папки, ветки и service pins не заменяются автоматически.

Точные команды будущей реализации приведены в [инструкции разработчика](https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-code/blob/main/docs/developer-handoff.md).

Planning SHA и service SHA фиксируют независимые роли: происхождение требований и
версию кода для чтения. Репозитории и SHA могут совпасть, но service pin выбирают
и проверяют отдельно, а не копируют из planning provenance. Код сервиса на этой
ступени не меняется, Apply не запускается, задачи реализации остаются `- [ ]`.

## Два честных входа

Шаги 4–5 продолжают обязательный шаг 3 «Изменение в OpenSpec». Организатор готовит и публикует персональную ветку `course/<LOGIN>/stage-4-import-base` из полного SHA согласованного planning source. В неё входят все фактически активные Changes источника и весь `openspec/specs/`; предметная main spec может отсутствовать. Если ученик прошёл шаг 3, его активный Change также входит в source и импортируется без специального имени или фиксированного количества.

Если вы начинаете сразу с шагов 4–5, есть два варианта. С организатором он передаёт вам личную базу. Без организатора вы сами берёте опубликованную example import-base (`course/example/stage-4-import-base`) и создаёте из неё личную базу в своём fork (раздел 1). Это пример, а не ваша вымышленная история шагов 1–3. Не используйте неподготовленную `main` метарепозитория как эквивалент personal import-base.

Эта `main` — шаблон и источник для подготовки, а не учебный вход: маршрут
начинается с подготовленной import-base, выданной организатором или опубликованной
как `course/example/stage-4-import-base`. Основной
интерфейс маршрута — VS Code с агентом Kilo; навыки OpenSpec лежат в
универсальном `.agents/skills` и читаются Kilo автоматически. Для работы
на шагах 4–5 нужен агент с доступом к утверждённой модели: модель помогает пройти
обсуждение и подготовить OpenSpec Change. Если модель недоступна, остановитесь
на последнем ручном шаге (1, 2 или 3) и вернитесь к шагам 4–5 после
восстановления доступа; полный курс без шагов 4–5 не завершён.

Перед работой разберите [исходный запрос и ответы](request-and-answers.md) —
это источник фактов упражнения, [общий шаблон intent](intent-template.md),
[предоставленный пример шагов 1–3](examples/clear-calculation-result.md) и отдельный
[запрос лимита для шагов 4–5](intents/intent-2-credit-limit.md). Пример помогает оформить
смысл, но не является второй версией фактов или личным документом ученика. В шагах 1–3
личный рабочий репозиторий хранит один актуальный intent и его историю. В шагах 4–5
появляется новая потребность — получить лимит из другой системы; не смешивайте её
с предыдущим запросом. В личной ветке обновляйте `intents/intent-2-credit-limit.md`
по мере подтверждения ответов; это один рабочий документ для запроса шагов 4–5, не копия
для каждого шага. Git даёт людям и модели проверяемый актуальный контекст, а
метарепозиторий связывает требования, схемы, код и историю изменений.

## 1. Создайте fork и получите учебную базу

Выберите свой маршрут. Организатор есть — идите по подразделу «С организатором». Организатора нет, вы учитесь самостоятельно — по подразделу «Самостоятельно, без организатора». Шаги 2–8 общие.

### Самостоятельно, без организатора

Готовой личной базы у вас нет: её создаёте вы сами из опубликованного примера `course/example/stage-4-import-base`. Пример — единственная допустимая стартовая точка; `main` и ветки без проверки SHA не используйте. Договор подготовки из шести значений, который с организатором передаёт он, вы собираете сами в шагах 4–7.

1. Создайте fork. В GitHub нажмите **Fork** и снимите флажок **Copy the main branch only**; в GitLab — **New project → Import project → Repository by URL** (импорт по адресу копирует все ветки). В терминале fork не создаётся: этот шаг делается только в интерфейсе. Увидите свою копию репозитория; адрес на странице копии — адрес вашего fork.
2. Скопируйте адрес своего fork кнопкой **Code** (GitHub) или **Code → Clone with HTTPS** (GitLab) и клонируйте его. Адрес — ваш fork или проект в GitLab, не репозиторий организации `apolenkov`:

   ```bash
   git clone https://github.com/your_login/sdd-guide-credit-calculator-stage-4-requirements.git
   cd sdd-guide-credit-calculator-stage-4-requirements
   git remote get-url origin
   ```

   Замените `your_login` своим логином; в GitLab подставьте адрес вашего проекта. Последняя команда должна показать адрес вашего fork, не `apolenkov`.
3. Получите опубликованный пример и покажите его полный SHA:

   ```bash
   git fetch origin course/example/stage-4-import-base
   git rev-parse FETCH_HEAD
   ```

   Если fetch отвечает, что такой ветки нет, флажок **Copy the main branch only** не сняли. Остановитесь: создайте fork заново со снятым флажком (старый удаляйте только если в нём нет вашей работы) и не подставляйте `main`.
4. Сверьте SHA с исходным репозиторием курса, а не со своим fork: копия ветки в fork могла устареть.

   ```bash
   git ls-remote https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git refs/heads/course/example/stage-4-import-base
   ```

   Первая колонка вывода — SHA опубликованного примера. Сравните его с выводом `git rev-parse FETCH_HEAD` из шага 3. Совпал — это ваш `IMPORT_BASE_SHA`. Не совпал — копия в fork устарела; вывод пустой — пример в исходном репозитории не опубликован. В обоих случаях остановитесь, базу не создавайте и сообщите автору курса адрес fork и оба SHA.
5. Создайте из него личную базу и опубликуйте её в своём fork:

   ```bash
   git switch -c course/your_login/stage-4-import-base FETCH_HEAD
   git push -u origin course/your_login/stage-4-import-base
   git status --short --branch
   ```

   Увидите `## course/your_login/stage-4-import-base...origin/course/your_login/stage-4-import-base` без `ahead`/`behind`. Личная рабочая ветка создаётся позже, в разделе 4, от этой базы.
6. Возьмите остальные значения из файлов базы. Им можно доверять: SHA базы сверен с исходным репозиторием в шаге 4.

   ```bash
   grep '"commit"' docs/course/planning-provenance.json
   grep 'commit:' services.lock.yaml
   ```

   Первая команда покажет `PLANNING_SHA`, вторая — `SERVICE_SHA`. `REVIEW_REFERENCE` — ссылки на review исходной версии из `docs/course/stage-3-transfer.md`; если review там «ожидается» или `pending`, пишите `pending`.
7. В разделе 2 вставьте договор после основного сообщения агенту:

   ```text
   Учусь без организатора, договор собран по README.
   META_REPOSITORY_URL=https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git
   IMPORT_BASE_BRANCH=course/your_login/stage-4-import-base
   IMPORT_BASE_SHA=<SHA из шага 4>
   PLANNING_SHA=<SHA из planning-provenance.json>
   SERVICE_SHA=<SHA из services.lock.yaml>
   REVIEW_REFERENCE=<ссылки из stage-3-transfer.md или pending>
   ```

   `META_REPOSITORY_URL` — исходный репозиторий курса, из которого вы сделали fork, а не адрес fork. Дальше везде, где в тексте стоит `<LOGIN>`, читайте `your_login`; целью PR анализа (раздел 8) выберите личную базу `course/your_login/stage-4-import-base`, а не `main` и не ветку в upstream.

Force push, запись в чужой репозиторий и `main` в этих шагах не нужны.

### С организатором

Организатор передаёт единый договор: `<META_REPOSITORY_URL>`,
`<IMPORT_BASE_BRANCH>` (`course/<LOGIN>/stage-4-import-base`),
`<IMPORT_BASE_SHA>`, исходный `<PLANNING_SHA>`, независимый `<SERVICE_SHA>` и
`<REVIEW_REFERENCE>`. Базовую ветку создаёт организатор, ученик её не создаёт.

Откройте `<META_REPOSITORY_URL>` на GitHub, нажмите **Fork** и выберите своё
личное пространство. Учебная база — не `main`, поэтому снимите флажок
**Copy the main branch only**, чтобы ветки скопировались в fork. Затем
клонируйте свой fork; после clone `origin` — ваш fork:

```bash
set -eu
git clone --branch course/<LOGIN>/stage-4-import-base --single-branch \
  <FORK_REPOSITORY_URL> \
  sdd-guide-credit-calculator-stage-4-requirements
cd sdd-guide-credit-calculator-stage-4-requirements
git remote get-url origin
test "$(git rev-parse HEAD)" = "<IMPORT_BASE_SHA>"
git status --short --branch
```

Если ветка есть в upstream на переданном SHA, но не скопировалась в fork
(флажок не сняли), получите её из upstream командой `git fetch`: разрешён один fail-closed fallback. Он сначала доказывает отсутствие одноимённой
ветки в fork, затем читает только upstream и публикует проверенный SHA в `origin`:

```bash
set -eu
git clone --no-checkout <FORK_REPOSITORY_URL> \
  sdd-guide-credit-calculator-stage-4-requirements
cd sdd-guide-credit-calculator-stage-4-requirements
git remote add upstream <META_REPOSITORY_URL>
existing_base=$(git ls-remote --heads origin refs/heads/course/<LOGIN>/stage-4-import-base)
test -z "$existing_base"
git fetch --no-tags upstream refs/heads/course/<LOGIN>/stage-4-import-base
test "$(git rev-parse FETCH_HEAD)" = "<IMPORT_BASE_SHA>"
git switch -c course/<LOGIN>/stage-4-import-base FETCH_HEAD
git push -u origin course/<LOGIN>/stage-4-import-base
remote_ref=$(git ls-remote --heads origin refs/heads/course/<LOGIN>/stage-4-import-base)
test -n "$remote_ref"
remote_head=${remote_ref%%[[:space:]]*}
test "$remote_head" = "<IMPORT_BASE_SHA>"
```

Если ветка отсутствует в upstream, SHA расходится или одноимённая ветка уже есть
в fork, остановитесь и передайте организатору URL, ветку, ожидаемый и фактический
SHA. Не используйте `main`, force push и запись в `upstream`; не удаляйте
существующую папку и не смешивайте две копии.

## 2. Подготовьте весь комплект через project skill

Откройте папку клона в VS Code и в чате агента Kilo отправьте одно сообщение:

```text
Нужна полная подготовка окружения этапа 4 после clone, без анализа требований.
Сначала выполни git rev-parse --show-toplevel и покажи абсолютный Git root.
Подставь этот абсолютный путь и прочитай целиком только
<ABSOLUTE-GIT-ROOT>/.agents/skills/setup-analysis-workspace/SKILL.md.
Покажи выбранный абсолютный путь к SKILL.md и выполни этот project skill
целиком в режиме полной подготовки. Одноимённый глобальный skill не используй.
```


Project skill проверяет базовую ветку и `IMPORT_BASE_SHA`, выполняет requirements
`npm ci` и `npm run setup`, безопасно создаёт либо проверяет соседний
`sdd-guide-credit-calculator-stage-4-code` на точном service pin, запускает его
`check:code`, связывает локальный Store, выполняет `store doctor`, два реальных
bootstrap и `check:store`. Новый code checkout остаётся detached; ветка реализации
не создаётся.

Если Store ID отсутствует, явный полный запрос разрешает регистрацию текущего
requirements root. Совпадающий root переиспользуется. При другом root skill
показывает старый и новый пути и останавливается за подтверждением; до него
unregister запрещён, а перед разрешённым переключением состояние проверяется
повторно. Существующий code-путь skill не заменяет и не переключает.

Успех означает `root.source = declared`, Store ID
`sdd-credit-calculator-product-meta`, realpath текущего requirements root,
совпадение независимых planning/service pins, два `bootstrap: PASS` и чистые
requirements, snapshots и code checkout. `.workspace/planning/stage-3` и
`.workspace/services/credit-calculator` доступны только для чтения. Skill не
создаёт Change, не запускает Apply и не выполняет commit/push.

Bootstrap сверяет точный Git-tree inventory, blob OID, SHA-256 исходных файлов и
каноническое Git-содержимое импорта; он не исправляет расхождения автоматически.

## 3. Прочитайте фактический унаследованный контракт

Откройте:

- `CONTEXT.md`, `product.yaml`, `services.lock.yaml`;
- `docs/course/planning-provenance.json`;
- `docs/course/stage-3-transfer.md` и `docs/course/requirements-traceability.md`;
- весь `openspec/specs/`;
- каждый Change из `imports.activeChanges` manifest.

Источник может содержать один или несколько активных Changes в зависимости от пройденного маршрута и фактической истории. Не требуйте фиксированное имя Change, число файлов, строк матрицы, сценариев или задач: источником правды служат Git tree, manifest и сами артефакты. В каждом импортированном `tasks.md` все задачи должны оставаться pending.

Служебные Changes самого шаблона не относятся к истории ученика и не входят в imported inventory. Новый `limit-credit-amount` должен учитывать каждый импортированный активный Change, который реально присутствует.

## 4. Создайте рабочую ветку

Проверьте base и чистоту, затем создайте ветку:

```bash
git status --short --branch
git switch -c course/<LOGIN>/stage-4-amount-limits
```

Самостоятельный ученик создаёт ветку тем же способом от личной базы, которую вы опубликовали в разделе 1:

```bash
git status --short --branch
git switch -c course/your_login/stage-4-amount-limits
```

Если рабочая ветка уже существует, продолжайте её только после проверки base. Не создавайте ветку от общей `main`.

## 5. Обсудите требование через original MTP grill

В том же чате отправьте:

```text
Загрузи original project skill grill-with-docs и прочитай его инструкции.
Обсудим Change limit-credit-amount: сумма кредита допустима от 10 000 ₽
до 100 000 000 ₽ включительно; 9 999 ₽ и 100 000 001 ₽ дают ошибку
и очищают все рассчитанные результаты.

Сначала прочитай planning-provenance.json, весь openspec/specs и каждый
импортированный active Change. Укажи зависимости и возможные конфликты.
Если прежний успешный сценарий использует сумму 101 ₽, отдельно спроси,
согласен ли я заменить его новой delta на пример 10 001 ₽, 0%, 2 месяца:
платёж 5 001 ₽, общая сумма 10 001 ₽, переплата 0 ₽. Не меняй
унаследованные файлы и не выбирай замену молча.

Задавай вопросы раундами до моего явного подтверждения общего понимания.
Не создавай Change, не запускай Apply и не меняй код.
```

Если в источнике нет payment summary, вопросы и будущая delta не должны выдумывать общую сумму или переплату. Если capability присутствует, ошибка суммы должна очищать все её результаты.

## 6. Используйте Explore только при оставшейся развилке

После grill вызовите OpenSpec Explore только если осталось существенное решение о поведении, замене сценария, структуре delta или проверке. Если все решения подтверждены, сразу переходите к Propose. Explore не нужен для пересказа принятого ответа.

## 7. Создайте Change через Propose

```text
Используй OpenSpec Propose для limit-credit-amount в Store
sdd-credit-calculator-product-meta. Создай proposal, delta specs, design
и tasks. Явно перечисли зависимости от каждого импортированного active
Change из planning-provenance.json.

Источник замысла — intents/intent-2-credit-limit.md: прочитай его целиком.
Границы лимита калькулятор получает из системы банка, а не хранит
константами: опиши в requirements получение лимита и сценарий «лимит
изменён в системе банка — после согласованного обновления калькулятор
применяет новое значение без правки формулы». Сами лимиты и формулу
не меняй. Явно запиши открытыми вопросами, если они не подтверждены
владельцем решения: как часто калькулятор получает обновлённый лимит и
что он показывает при недоступности системы банка (в том числе можно ли
использовать последние известные значения). Не придумывай ответы.

Зафиксируй включительные границы 10 000 и 100 000 000 ₽, ошибочные
9 999 и 100 000 001 ₽ и очистку всех применимых результатов. Если на
grill согласована замена конфликтующих примеров 101 ₽, вырази её новой
MODIFIED delta через 10 001 ₽; исходные imported файлы не меняй.

Все задачи реализации и проверки оставь - [ ]. Не запускай Apply,
archive или sync и не меняй код сервиса.
```

Сверяйте результат по фактическим исходным артефактам: считайте незатронутые сценарии, заменённые ожидания и новые сценарии отдельно. Не складывайте повторённые MODIFIED-блоки как новые требования и не подставляйте ожидаемые числа: проверяйте Git tree, manifest и сами файлы.

## 8. Проверьте содержание и сохраните результат

Сначала прочитайте все созданные файлы и итоговый договор зависимых Changes. Затем выполните:

```bash
npm exec openspec -- status --change limit-credit-amount --json --store sdd-credit-calculator-product-meta
npm exec openspec -- validate --all --strict --no-interactive --store sdd-credit-calculator-product-meta
npm run check
git diff --check
git diff
git status --short
```

Сохраняйте исходный exit status каждой команды; не считайте отфильтрованный вывод результатом самой проверки. Зелёная валидация не доказывает отсутствие смыслового конфликта и не является реализацией функций.

Добавьте только новый Change и согласованную матрицу, прочитайте staged diff:

```bash
set -eu
git add openspec/changes/limit-credit-amount docs/course/requirements-traceability.md
git diff --cached
git status --short
git commit -m "docs: propose inclusive credit amount limits"
branch="course/<LOGIN>/stage-4-amount-limits"
git push -u origin "$branch"
local_head=$(git rev-parse HEAD)
remote_ref=$(git ls-remote --heads origin "refs/heads/$branch")
test -n "$remote_ref"
remote_head=${remote_ref%%[[:space:]]*}
test "$remote_head" = "$local_head"
```

Откройте planning PR (в GitLab — MR) внутри своего fork: source
`course/<LOGIN>/stage-4-amount-limits` → target
`course/<LOGIN>/stage-4-import-base`, не в общую `main` (без организатора это
ваши `course/your_login/stage-4-amount-limits` → `course/your_login/stage-4-import-base`; в списке
веток выберите именно личную базу в своём fork). Описание заполните по
`.github/pull_request_template.md`: в нём два раздела, для этого запроса нужен
«Запрос 1: анализ». В GitHub текст подставится сам, в GitLab шаблона `.gitlab`
нет: откройте файл в репозитории, скопируйте раздел «Запрос 1» и вставьте в
описание MR. Одобрение по текущему diff даёт владелец продукта: он нажимает Approve. Аналитик и техлид оставляют замечания в PR. Шаги 4–5 затрагивают интеграцию с системой банка, поэтому архитектора приглашают через @: он пишет замечания (и `design.md`), но одобряет по-прежнему владелец продукта. После новых коммитов владелец продукта одобряет последнюю версию заново. Автор не одобряет свой запрос; ИИ и автоматическая проверка одобрение не заменяют. После одобрения
смёржьте учебный PR в личную base-ветку своего fork; в общую
`main` не сливайте. Если платформа предлагает target в upstream или другой
проект, остановитесь и исправьте source/target.

Второй запрос — после реализации и проверки людьми на практикуме разработки, не сейчас:
подтверждённые статусы задач уходят в `main` вашего fork. Для него отдельный раздел
«Запрос 2: статусы задач после реализации» того же шаблона. Задачи в `tasks.md` отмечайте
выполненными только после проверки людьми.

## STOP: реализация отдельно

Результат шагов 4–5 — согласованный активный Change. Не запускайте Apply, не отмечайте tasks выполненными и не редактируйте `.workspace`. Разработчик позже использует отдельный рабочий checkout сервиса; read-only snapshot внутри Store им не является.

[Инструкция организатору](docs/organizer-stage-4.md) описывает подготовку и публикацию import-base. [CONTRIBUTING.md](CONTRIBUTING.md) отделяет сопровождение эталона от работы ученика.
