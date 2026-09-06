# Ступень 4. ИИ и продуктовый OpenSpec Store

Это четвёртая аналитическая ступень. Вы получаете подготовленную организатором личную `course/your_login/stage-4-import-base`: весь активный Change `add-reset-and-years-term` и весь `add-payment-summary` из полного SHA ступени 3-ИИ, а также отдельный закреплённый read-only snapshot сервиса. В этой личной базе `your_login` = `wrk`. Унаследованы 33 сценария и 21 незавершённая задача; человеческие ревью ещё ожидаются. Main specs содержат только `.gitkeep`, доказанный runtime baseline не заявлен.

Работайте только в этой папке product-meta. `.workspace/planning/stage-3` проверяет происхождение документов; `.workspace/services/credit-calculator` даёт контекст кода. Оба снимка только для чтения. Старая папка R1–R3 остаётся историей.

С помощью OpenCode вы готовите новый зависимый Change `limit-credit-amount`: сумма кредита допустима от `10 000 ₽` до `100 000 000 ₽` включительно; соседние целые значения `9 999 ₽` и `100 000 001 ₽` отклоняются, предыдущий результат очищается. Это синтетическое условие курса, не банковское правило.

Результат — согласованный Change в Store. Код сервиса не меняется, Apply не запускается, задачи реализации остаются незавершёнными.

## 1. Получите готовую личную базу

Организатор передаёт точный локальный путь и подтверждает:

- ветка `course/your_login/stage-4-import-base` чистая;
- `docs/course/stage-3-transfer.md` содержит исходный репозиторий, полный SHA и пути;
- `openspec/specs/` и оба Change перенесены по inventory из `docs/course/planning-provenance.json` без потери файлов;
- planning SHA — `307bfe46006a9f289b56d1ae2c156af92d9529d4`, а `services.lock.yaml` отдельно закрепляет сервис на `97d07d1c0723c1d9ac79a444bd120195877a01a8`;
- Store `sdd-credit-calculator-product-meta` зарегистрирован именно на выданную папку;
- зависимости, project skills и корпоративный OpenCode уже подготовлены.

Аналитик не выполняет clone, `npm ci`, `npm run setup`, регистрацию Store или импорт контракта. Если чего-то нет, верните папку организатору; не восстанавливайте окружение догадками.

## 2. Проверьте bootstrap и Store root

```bash
cd "/путь/от-организатора/sdd-credit-calculator-product-meta-example"
npm run bootstrap
npm exec openspec -- store doctor sdd-credit-calculator-product-meta --json
```

`bootstrap: PASS` должен подтвердить provenance-файлы, оба унаследованных Change с незавершёнными tasks, Store root и оба закреплённых SHA. Он сравнивает точный inventory и байты импортированных документов с Git tree planning SHA; service SHA проверяется независимо. Команда останавливается при пропущенном или изменённом файле, чужом baseline, грязном meta checkout, другой регистрации Store, грязном/чужом snapshot или несовпадающем SHA; ничего из этого она не перезаписывает.

`.workspace/services/credit-calculator` используется только для чтения. Это не рабочая папка разработчика, её зависимости не устанавливаются.

SHA-256 manifest относится к исходным Git blob. Под «байтами» проверки выше понимается каноническое Git-содержимое: штатная нормализация окончаний строк LF/CRLF допускается и проверяется отдельно тестом. В этой личной копии также сверены SHA-256 фактических файлов без нормализации.

## 3. Запустите OpenCode и создайте рабочую ветку

```bash
opencode
```

Выберите подготовленную корпоративную модель и отправьте:

```text
Я аналитик учебной ступени 4. Работаю в подготовленном Store
sdd-credit-calculator-product-meta. Прочитай AGENTS.md, README.md,
CONTEXT.md, product.yaml, services.lock.yaml,
docs/course/stage-3-transfer.md,
docs/course/planning-provenance.json и оба унаследованных активных Change:
openspec/changes/add-reset-and-years-term и openspec/changes/add-payment-summary.
Main specs пусты; это не ошибка и не повод копировать spec сервиса.

Проверь Store root, текущую ветку и git status. Ожидаемая личная base —
course/your_login/stage-4-import-base. Если дерево чистое и открыта эта
base, создай course/your_login/stage-4-amount-limits. Если рабочая ветка
уже открыта, продолжай в ней. При другой ветке или правках остановись.

Для чтения OpenSpec используй явный
--store sdd-credit-calculator-product-meta. Не запускай setup,
регистрацию Store, clone, Apply или миграцию сервиса. .workspace только
читай. Не меняй код, не выполняй commit, push или внешние записи.
```

Замените `your_login`; для повторного прохождения используйте одинаковый суффикс у обеих личных веток.

## 4. Проверьте унаследованный контракт

В отдельном терминале той же папки выполните:

```bash
npm exec openspec -- status --change add-reset-and-years-term --json --store sdd-credit-calculator-product-meta
npm exec openspec -- instructions apply --change add-reset-and-years-term --json --store sdd-credit-calculator-product-meta
npm exec openspec -- status --change add-payment-summary --json --store sdd-credit-calculator-product-meta
```

Оба Change должны быть активными: 23 + 10 сценариев, 12 + 9 задач `- [ ]`. Согласование не превращает их в реализованные функции. Сверьте `docs/course/requirements-traceability.md`: очистка результата при ошибке относится к активному Change, не к runtime baseline; ввод целых месяцев сохраняется; режим лет имеет шаг кнопок `0,5`, default `20 лет` и перевод `0,5→6`, `20→240`; reset сохраняет выбранный режим, возвращает `240 месяцев` либо `20 лет`, очищает ошибки и все три результата и не запускает расчёт. Общая сумма и переплата используют неокруглённый платёж.

Если Change отсутствует, архивирован как реализованный, не совпадает с source SHA или потерял сценарий, остановитесь и верните папку организатору.

## 5. Обсудите новое требование через original MTP grill

Использование ИИ на этой ступени обязательно. В той же сессии отправьте:

```text
Загрузи оригинальный project skill grill-with-docs и прочитай требуемые
им инструкции. Обсудим зависимое изменение limit-credit-amount:
сумма кредита допустима от 10 000 ₽ до 100 000 000 ₽ включительно;
9 999 ₽ и 100 000 001 ₽ должны давать ошибку и очищать предыдущий
результат. Это синтетические условия, не банковские правила.
Выяви конфликт нового минимума с унаследованными успешными сценариями
на 101 ₽. Согласуй со мной, какие сценарии новая delta заменяет и чем
проверяется округление в допустимом диапазоне; не выбирай решение молча.

Сопоставь идею с продуктовым контекстом, provenance и обоими
унаследованными Change add-reset-and-years-term и add-payment-summary: месячный ввод сохраняется,
переключатель выбирает месяцы или годы, годы переводятся в целые месяцы,
reset работает в обоих режимах и не запускает расчёт; ошибка очищает платёж,
общую сумму и переплату. Main specs пусты. Задавай вопросы раундами
до явного подтверждения общего понимания. Не придумывай отсутствующие
факты, не меняй документы или код и не создавай Change.
```

Ответьте на вопросы и явно подтвердите итог. ИИ не заменяет решение человека.

## 6. Используйте Explore только для существенной развилки

Если после grill остаётся решение, влияющее на поведение, design или проверку, попросите OpenSpec Explore разобрать варианты без edits. Если развилки нет, переходите к Propose; не запускайте Explore для пересказа уже принятого решения.

## 7. Создайте зависимый Change через Propose

```text
Используй OpenSpec Propose для limit-credit-amount в явном Store
sdd-credit-calculator-product-meta. Создай полный набор spec-driven:
proposal, delta specs, design и tasks. В proposal и design укажи
зависимость от активных add-reset-and-years-term и add-payment-summary и исходного SHA из
docs/course/stage-3-transfer.md; официальный Store не объединяет Changes
автоматически.

Подготовь зависимую delta capability credit-calculator из активного Change,
не создавая фиктивную main spec: допустимы 10 000 ₽
и 100 000 000 ₽ включительно; 9 999 ₽ и 100 000 001 ₽ отклоняются,
ошибка очищает платёж, общую сумму выплат и переплату. Сохрани исходные файлы
обоих унаследованных Change без изменения. Новая delta должна явно описать
согласованную при grill замену конфликтующих сценариев на 101 ₽ и проверки
округления в допустимом диапазоне. Если решение не согласовано, остановись
для вопроса. Сохрани незатронутое поведение: месячный ввод, переключатель, перевод
`0,5 года = 6 месяцев`, `20 лет = 240 месяцев` и reset в обоих режимах
без auto-recalc. Добавь отдельную незавершённую задачу реализации
и точную проверку нового диапазона. Обнови
docs/course/requirements-traceability.md строкой нового Change.

Не меняй код или services.lock.yaml, не запускай Apply, не отмечай tasks
выполненными и не архивируй Changes. Выполни strict validation с явным
--store и остановись для review.
```

## 8. Проведите ИИ-review и автоматические проверки

Попросите агента критически сверить оба унаследованных Change, новый Change и матрицу. Он должен найти потерянные сценарии, ложные утверждения о реализации, закрытые tasks и неявные зависимости. Исправляйте только принятые замечания.

```bash
npm exec openspec -- status --change limit-credit-amount --json --store sdd-credit-calculator-product-meta
npm exec openspec -- validate add-reset-and-years-term --strict --store sdd-credit-calculator-product-meta
npm exec openspec -- validate add-payment-summary --strict --store sdd-credit-calculator-product-meta
npm exec openspec -- validate limit-credit-amount --strict --store sdd-credit-calculator-product-meta
npm run check
git diff --check
git diff
git status --short
```

Эти проверки не доказывают реализацию переключателя срока, reset в обоих режимах или диапазона суммы.

## 9. Получите два человеческих review

Добавьте только новый Change и обновлённую матрицу, прочитайте staged diff:

```bash
git add openspec/changes/limit-credit-amount docs/course/requirements-traceability.md
git diff --cached
git status --short
git commit -m "docs: propose inclusive credit amount limits"
git push -u origin course/your_login/stage-4-amount-limits
```

Откройте planning PR из `course/your_login/stage-4-amount-limits` в личную `course/your_login/stage-4-import-base`, не в общую `main`. Другой аналитик проверяет требования, затем разработчик или архитектор — реализуемость design, задач и проверок. После содержательных правок оба review повторяются для актуального diff.

После двух подтверждений закройте PR без слияния и сохраните рабочую ветку. Итог — согласованный активный `limit-credit-amount`, зависимый от активных `add-reset-and-years-term` и `add-payment-summary`; все задачи реализации остаются `- [ ]`. Пока отзывов нет, этот итог не достигнут.

## Реализация отдельно

Разработчик использует две соседние папки, явный Store root и отдельную персональную Store-only ветку сервиса. Общая `main` R3 остаётся repo-local, `.workspace` — read-only. Полная процедура находится в [практикуме сервиса](https://github.com/apolenkov/sdd-guide-credit-calculator-stage-3/blob/main/docs/developer-handoff.md).

[Сопровождение и подготовка](CONTRIBUTING.md) предназначены организатору, не аналитику.
