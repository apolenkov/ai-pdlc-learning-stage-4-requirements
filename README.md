# Ступень 4. ИИ и продуктовый OpenSpec Store

Это четвёртая аналитическая ступень. Аналитик работает в личном fork
метарепозитория, а два закреплённых снимка в `.workspace/` использует только для
проверки:

```text
личный Git SHA результата R3 или R3-ИИ
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

Для будущей реализации готовый комплект R4 состоит из двух соседних рабочих папок:

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

Основной вход продолжает ваш результат R3 или необязательного R3-ИИ. Организатор готовит и публикует персональную ветку `course/<LOGIN>/stage-4-import-base` из вашего полного Git SHA. В неё входят все фактически активные Changes источника и весь `openspec/specs/`; предметная main spec может отсутствовать.

Если вы начинаете сразу с R4, организатор указывает отдельный учебный source ref и публикует явно названную example import-base. Это пример, а не ваша вымышленная история R1–R3. Не используйте неподготовленную `main` метарепозитория как эквивалент personal import-base.

Эта `main` — шаблон и источник для подготовки, а не учебный вход: маршрут
начинается с уже выданной организатором подготовленной import-base. Основной
интерфейс маршрута — VS Code с агентом Kilo; терминальный `opencode` остаётся
необязательной продвинутой альтернативой, а не обязательным мостом.

## 1. Создайте fork и клонируйте опубликованную базу

Организатор передаёт единый договор: `<META_REPOSITORY_URL>`,
`<IMPORT_BASE_BRANCH>` (`course/<LOGIN>/stage-4-import-base`),
`<IMPORT_BASE_SHA>`, исходный `<PLANNING_SHA>`, независимый `<SERVICE_SHA>` и
`<REVIEW_REFERENCE>`. Базовую ветку создаёт организатор, ученик её не создаёт.

Откройте `<META_REPOSITORY_URL>` в GitLab, нажмите **Fork** и выберите своё
личное пространство — GitLab копирует в fork все ветки, отдельная отметка не
нужна. Затем клонируйте свой fork; после clone `origin` — ваш fork:

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

Если ветка есть в upstream на переданном SHA, но не скопировалась в fork,
разрешён один fail-closed fallback. Он сначала доказывает отсутствие одноимённой
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

<details>
<summary>Advanced: терминальный вход через OpenCode</summary>

Тот же маршрут доступен и без VS Code: из корня клона запустите `opencode` и
отправьте то же сообщение. Project skill, проверки и дальнейшие шаги не
отличаются — при уже проверенном Kilo это необязательная альтернатива,
а не обязательный мост.

</details>

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

После обычной R3 источник содержит минимум один активный Change. После необязательной R3-ИИ их может быть два или больше. Не требуйте фиксированное имя второго Change, число файлов, строк матрицы или сценариев: источником правды служат Git tree, manifest и сами артефакты. В каждом импортированном `tasks.md` все задачи должны оставаться pending.

Служебные Changes самого шаблона не относятся к истории ученика и не входят в imported inventory. Новый `limit-credit-amount` должен учитывать каждый импортированный активный Change, который реально присутствует.

## 4. Создайте рабочую ветку

Проверьте base и чистоту, затем создайте ветку:

```bash
git status --short --branch
git switch -c course/<LOGIN>/stage-4-amount-limits
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

Зафиксируй включительные границы 10 000 и 100 000 000 ₽, ошибочные
9 999 и 100 000 001 ₽ и очистку всех применимых результатов. Если на
grill согласована замена конфликтующих примеров 101 ₽, вырази её новой
MODIFIED delta через 10 001 ₽; исходные imported файлы не меняй.

Все задачи реализации и проверки оставь - [ ]. Не запускай Apply,
archive или sync и не меняй код сервиса.
```

Для полного учебного примера R3+3-ИИ итог считают по смыслу: 31 незатронутый унаследованный сценарий + 2 явно заменённых ожидания + 5 действительно новых сценариев = 38 действующих сценариев. Это проверка конкретного примера, а не универсальная константа. Не складывайте повторённые MODIFIED-блоки как новые требования; фактические числа берите из файлов.

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

Откройте planning MR внутри своего fork: source
`course/<LOGIN>/stage-4-amount-limits` → target
`course/<LOGIN>/stage-4-import-base`, не в общую `main`. Другой аналитик проверяет требования, затем разработчик или архитектор — реализуемость. После содержательных
правок оба review повторяются для актуального diff. После двух подтверждений
смёржьте учебный MR в личную base-ветку своего корпоративного fork; в общую
`main` не сливайте. Если GitLab предлагает target в upstream `example-group` или другой
проект, остановитесь и исправьте source/target.

## STOP: реализация отдельно

Результат R4 — согласованный активный Change. Не запускайте Apply, не отмечайте tasks выполненными и не редактируйте `.workspace`. Разработчик позже использует отдельный рабочий checkout сервиса; read-only snapshot внутри Store им не является.

[Инструкция организатору](docs/organizer-stage-4.md) описывает подготовку и публикацию import-base. [CONTRIBUTING.md](CONTRIBUTING.md) отделяет сопровождение эталона от работы ученика.
