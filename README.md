# Ступень 4. ИИ и продуктовый OpenSpec Store

Это четвёртая аналитическая ступень. Аналитик работает в одном личном checkout метарепозитория, а два закреплённых снимка в `.workspace/` использует только для проверки:

```text
личный Git SHA результата R3 или R3-ИИ
              │ организатор переносит весь planning inventory
              ▼
personal import-base в product-meta ── публикация ветки
              │ ученик клонирует её сам
              ▼
sdd-credit-calculator-product-meta-example/
├── openspec/                         единственное место изменения требований
├── .workspace/planning/stage-3/      source provenance, только чтение
└── .workspace/services/...           контекст сервиса, только чтение
```

Planning SHA и service SHA фиксируют независимые роли: происхождение требований и версию кода для чтения. Репозитории и SHA могут совпасть, но service pin выбирают и проверяют отдельно, а не копируют из planning provenance. Код сервиса на этой ступени не меняется, Apply не запускается, задачи реализации остаются `- [ ]`.

## Два честных входа

Основной вход продолжает ваш результат R3 или необязательного R3-ИИ. Организатор готовит и публикует персональную ветку `course/<LOGIN>/stage-4-import-base` из вашего полного Git SHA. В неё входят все фактически активные Changes источника и весь `openspec/specs/`; предметная main spec может отсутствовать.

Если вы начинаете сразу с R4, организатор указывает отдельный учебный source ref и публикует явно названную example import-base. Это пример, а не ваша вымышленная история R1–R3. Не используйте неподготовленную `main` метарепозитория как эквивалент personal import-base.

## 1. Клонируйте опубликованную базу

Организатор передаёт URL метарепозитория, точное имя опубликованной import-base и planning SHA. Убедитесь, что папки с каноническим именем ещё нет, затем выполните:

```bash
git clone --branch course/<LOGIN>/stage-4-import-base --single-branch \
  https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git \
  sdd-credit-calculator-product-meta-example
cd sdd-credit-calculator-product-meta-example
git status --short --branch
git rev-parse HEAD
```

Замените `<LOGIN>` и имя ветки значениями организатора. Ожидаемый результат — открыта переданная ветка, status пуст. При отсутствующей ветке, другом SHA или существующей папке остановитесь: не подставляйте `main`, не удаляйте каталог и не смешивайте две копии.

## 2. Запустите OpenCode и подготовьте checkout через project skill

Из корня клона запустите:

```bash
opencode
```

Имя `setup-analysis-workspace` может совпасть с глобальным skill. Выбирать его
только по имени нельзя: сначала привяжите инструкцию к проверенному Git root.

Отправьте сообщение:

```text
Сначала выполни git rev-parse --show-toplevel и покажи полный Git root.
Внутри именно этого root найди и прочитай целиком
.agents/skills/setup-analysis-workspace/SKILL.md. До npm ci/setup покажи
полный путь выбранного SKILL.md и подтверди, что его базовая папка равна
<git-root>/.agents/skills/setup-analysis-workspace. Если имя
setup-analysis-workspace разрешается в
~/.agents/skills/setup-analysis-workspace/SKILL.md, иной глобальный каталог
skills или любой другой файл, НЕ выполняй его: прочитай и следуй
project-файлу напрямую.

По project-файлу выполни npm ci ровно один раз, затем npm run setup ровно
один раз. Сохрани exit status каждой исходной команды и в конце покажи git
status. Если обе команды уже успешно завершились в этой сессии, не повторяй
их: покажи только Git root и status и остановись. STOP после чистого setup.
Не регистрируй Store, не запускай bootstrap, не создавай ветку/Change, не
делай commit или push и не меняй настройки провайдера.
```

Project-файл выполняет `npm ci` и один `npm run setup`, проверяя чистоту Git
до и после. Если OpenCode показывает другой полный путь к skill, не запускайте
его и потребуйте прочитать файл внутри текущего Git root напрямую. Если команда
завершилась ошибкой или status изменился, подготовка не окончена; не чините
package/lock догадками.

Если успешные `npm ci` и `npm run setup` уже были выполнены, используйте
короткое recovery-сообщение и не запускайте setup повторно:

```text
STOP. Не повторяй npm ci или npm run setup. Покажи git rev-parse
--show-toplevel и git status --short --branch, подтверди уже полученные exit
status 0 и остановись. Не запускай глобальный skill, Store или bootstrap.
```

## 3. Проверьте Store root

После успешного setup выполните из того же корня:

```bash
npm exec openspec -- store list --json
```

Нужен Store ID `sdd-credit-calculator-product-meta`, указывающий точно на текущую папку.

- Если ID отсутствует, остановитесь и получите явное разрешение организатора на регистрацию именно этого checkout. Отсутствие записи не разрешает регистрировать Store автоматически. Только после такого разрешения выполните:

```bash
npm exec openspec -- store register . \
  --id sdd-credit-calculator-product-meta --yes --json
npm exec openspec -- store doctor sdd-credit-calculator-product-meta --json
```

- Если ID указывает на другую папку, покажите организатору оба пути и остановитесь. Не выполняйте unregister/remove и не переназначайте чужой root.
- Если root совпадает, проверьте его:

```bash
npm exec openspec -- store doctor sdd-credit-calculator-product-meta --json
```

## 4. Дважды проверьте bootstrap

Только при правильном Store root и чистом status выполните две отдельные команды без `grep`, `tail` или pipeline:

```bash
npm run bootstrap
npm run bootstrap
git status --short
git -C .workspace/planning/stage-3 status --short
git -C .workspace/services/credit-calculator status --short
```

Оба запуска должны завершиться `bootstrap: PASS`: первый получает либо переиспользует два read-only снимка, второй подтверждает идемпотентность. Пустой вывод трёх status означает чистое состояние. Результаты fixture-тестов внутри `npm run check` не заменяют эти два реальных запуска.

`.workspace/planning/stage-3` и `.workspace/services/credit-calculator` доступны только для чтения: не исправляйте в них planning или код.

Bootstrap сверяет source repository/SHA, точный Git-tree inventory, blob OID, SHA-256 исходного blob и каноническое Git-содержимое импорта. LF/CRLF рабочего checkout может нормализоваться Git. Команда не исправляет потерянные или лишние файлы, checked tasks, грязный snapshot и конфликт Store root.

## 5. Прочитайте фактический унаследованный контракт

Откройте:

- `CONTEXT.md`, `product.yaml`, `services.lock.yaml`;
- `docs/course/planning-provenance.json`;
- `docs/course/stage-3-transfer.md` и `docs/course/requirements-traceability.md`;
- весь `openspec/specs/`;
- каждый Change из `imports.activeChanges` manifest.

После обычной R3 источник содержит минимум один активный Change. После необязательной R3-ИИ их может быть два или больше. Не требуйте фиксированное имя второго Change, число файлов, строк матрицы или сценариев: источником правды служат Git tree, manifest и сами артефакты. В каждом импортированном `tasks.md` все задачи должны оставаться pending.

Служебные Changes самого шаблона не относятся к истории ученика и не входят в imported inventory. Новый `limit-credit-amount` должен учитывать каждый импортированный активный Change, который реально присутствует.

## 6. Создайте рабочую ветку

Проверьте base и чистоту, затем создайте ветку:

```bash
git status --short --branch
git switch -c course/<LOGIN>/stage-4-amount-limits
```

Если рабочая ветка уже существует, продолжайте её только после проверки base. Не создавайте ветку от общей `main`.

## 7. Обсудите требование через original MTP grill

В OpenCode отправьте:

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

## 8. Используйте Explore только при оставшейся развилке

После grill вызовите OpenSpec Explore только если осталось существенное решение о поведении, замене сценария, структуре delta или проверке. Если все решения подтверждены, сразу переходите к Propose. Explore не нужен для пересказа принятого ответа.

## 9. Создайте Change через Propose

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

## 10. Проверьте содержание и сохраните результат

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
git add openspec/changes/limit-credit-amount docs/course/requirements-traceability.md
git diff --cached
git status --short
git commit -m "docs: propose inclusive credit amount limits"
git push -u origin course/<LOGIN>/stage-4-amount-limits
```

Откройте planning PR в личную `course/<LOGIN>/stage-4-import-base`, не в общую `main`. Другой аналитик проверяет требования, затем разработчик или архитектор — реализуемость. После содержательных правок оба review повторяются для актуального diff. После двух подтверждений сохраните ветку и закройте учебный PR без слияния.

## STOP: реализация отдельно

Результат R4 — согласованный активный Change. Не запускайте Apply, не отмечайте tasks выполненными и не редактируйте `.workspace`. Разработчик позже использует отдельный рабочий checkout сервиса; read-only snapshot внутри Store им не является.

[Инструкция организатору](docs/organizer-stage-4.md) описывает подготовку и публикацию import-base. [CONTRIBUTING.md](CONTRIBUTING.md) отделяет сопровождение эталона от работы ученика.
