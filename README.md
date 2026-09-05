# Ступень 4. ИИ и продуктовый OpenSpec Store

Это четвёртая аналитическая ступень. Вы получаете подготовленную организатором личную `course/your_login/stage-4-import-base`: в ней уже находятся baseline, **весь** согласованный активный Change `add-reset-and-years-term` из вашего полного SHA ступени 3 и закреплённый read-only snapshot сервиса. Унаследованный Change сохраняет ввод целого срока в месяцах, добавляет переключатель «месяцы / годы», перевод лет в целые месяцы и reset в обоих режимах без auto-recalc.

С помощью OpenCode вы готовите новый зависимый Change `limit-credit-amount`: сумма кредита допустима от `10 000 ₽` до `100 000 000 ₽` включительно; соседние целые значения `9 999 ₽` и `100 000 001 ₽` отклоняются, предыдущий результат очищается. Это синтетическое условие курса, не банковское правило.

Результат — согласованный Change в Store. Код сервиса не меняется, Apply не запускается, задачи реализации остаются незавершёнными.

## 1. Получите готовую личную базу

Организатор передаёт точный локальный путь и подтверждает:

- ветка `course/your_login/stage-4-import-base` чистая;
- `docs/course/stage-3-transfer.md` содержит исходный репозиторий, полный SHA и пути;
- `openspec/specs/credit-calculator/spec.md` и весь `openspec/changes/add-reset-and-years-term/` перенесены из этого SHA;
- `services.lock.yaml` закрепляет тот же проверенный SHA для read-only контекста;
- Store `sdd-credit-calculator-product-meta` зарегистрирован именно на выданную папку;
- зависимости, project skills и корпоративный OpenCode уже подготовлены.

Аналитик не выполняет clone, `npm ci`, `npm run setup`, регистрацию Store или импорт контракта. Если чего-то нет, верните папку организатору; не восстанавливайте окружение догадками.

## 2. Проверьте bootstrap и Store root

```bash
cd "/путь/от-организатора/sdd-credit-calculator-product-meta-example"
npm run bootstrap
npm exec openspec -- store doctor sdd-credit-calculator-product-meta --json
```

`bootstrap: PASS` должен подтвердить provenance-файлы, полный унаследованный Change с незавершёнными tasks, Store root и закреплённый SHA. Он сравнивает точный inventory и байты импортированного baseline и всего Change с Git tree закреплённого service SHA. Команда останавливается при пропущенном или изменённом файле, чужом baseline, грязном meta checkout, другой регистрации Store, грязном/чужом snapshot или несовпадающем SHA; ничего из этого она не перезаписывает.

`.workspace/services/credit-calculator` используется только для чтения. Это не рабочая папка разработчика, её зависимости не устанавливаются.

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
openspec/specs/credit-calculator/spec.md и весь унаследованный активный
Change openspec/changes/add-reset-and-years-term.

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
```

Change должен быть активным. Его задачи переключателя «месяцы / годы», перевода лет и reset в обоих режимах должны быть `- [ ]`; согласование не превращает их в реализованные функции. Сверьте `docs/course/requirements-traceability.md`: очистка результата при ошибке относится к baseline; ввод целых месяцев сохраняется; режим лет имеет шаг `0,5`, default `20 лет` и перевод `0,5→6`, `20→240`; reset сохраняет выбранный режим, возвращает `240 месяцев` либо `20 лет`, очищает ошибки и результаты и не запускает расчёт.

Если Change отсутствует, архивирован как реализованный, не совпадает с source SHA или потерял сценарий, остановитесь и верните папку организатору.

## 5. Обсудите новое требование через original MTP grill

Использование ИИ на этой ступени обязательно. В той же сессии отправьте:

```text
Загрузи оригинальный project skill grill-with-docs и прочитай требуемые
им инструкции. Обсудим зависимое изменение limit-credit-amount:
сумма кредита допустима от 10 000 ₽ до 100 000 000 ₽ включительно;
9 999 ₽ и 100 000 001 ₽ должны давать ошибку и очищать предыдущий
результат. Это синтетические условия, не банковские правила.

Сопоставь идею с продуктовым контекстом, baseline, provenance и всем
унаследованным Change add-reset-and-years-term: месячный ввод сохраняется,
переключатель выбирает месяцы или годы, годы переводятся в целые месяцы,
reset работает в обоих режимах и не запускает расчёт. Задавай вопросы раундами
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
зависимость от активного add-reset-and-years-term и исходного SHA из
docs/course/stage-3-transfer.md; официальный Store не объединяет Changes
автоматически.

Измени существующую capability credit-calculator: допустимы 10 000 ₽
и 100 000 000 ₽ включительно; 9 999 ₽ и 100 000 001 ₽ отклоняются,
ошибка очищает предыдущий результат. Сохрани baseline и все сценарии
унаследованного Change, включая месячный ввод, переключатель, перевод
`0,5 года = 6 месяцев`, `20 лет = 240 месяцев` и reset в обоих режимах
без auto-recalc. Добавь отдельную незавершённую задачу реализации
и точную проверку нового диапазона. Обнови
docs/course/requirements-traceability.md строкой нового Change.

Не меняй код или services.lock.yaml, не запускай Apply, не отмечай tasks
выполненными и не архивируй Changes. Выполни strict validation с явным
--store и остановись для review.
```

## 8. Проведите ИИ-review и автоматические проверки

Попросите агента критически сверить baseline, унаследованный Change, новый Change и матрицу. Он должен найти потерянные сценарии, ложные утверждения о реализации, закрытые tasks и неявную зависимость. Исправляйте только принятые замечания.

```bash
npm exec openspec -- status --change limit-credit-amount --json --store sdd-credit-calculator-product-meta
npm exec openspec -- validate add-reset-and-years-term --strict --store sdd-credit-calculator-product-meta
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

После двух подтверждений закройте PR без слияния и сохраните рабочую ветку. Итог — согласованный активный `limit-credit-amount`, зависимый от активного `add-reset-and-years-term`; все задачи реализации остаются `- [ ]`.

## Реализация отдельно

Разработчик использует две соседние папки, явный Store root и отдельную персональную Store-only ветку сервиса. Общая `main` R3 остаётся repo-local, `.workspace` — read-only. Полная процедура находится в [практикуме сервиса](https://github.com/apolenkov/sdd-guide-credit-calculator-stage-3/blob/main/docs/developer-handoff.md).

[Сопровождение и подготовка](CONTRIBUTING.md) предназначены организатору, не аналитику.
