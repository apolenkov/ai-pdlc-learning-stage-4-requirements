# Как связаны ступени 3, Store и реализация

## Накопительный контракт

| Артефакт | Активный владелец на ступени 4 | Статус |
| --- | --- | --- |
| Baseline текущего калькулятора | product-meta Store | подтверждённое существующее поведение |
| `add-reset-and-years-term` | product-meta Store | согласованный активный Change, tasks `- [ ]` |
| `limit-credit-amount` | product-meta Store | новый зависимый Change, tasks `- [ ]` |
| Код и runtime-тесты | отдельный checkout сервиса | не меняются в аналитической ступени |
| `.workspace/services/credit-calculator` | meta, только read-only контекст | не место разработки |

Ступень 3 сначала работает repo-local. Организатор ступени 4 импортирует baseline и **весь** активный Change из конкретного личного SHA в Store. Завершённая ветка R3 становится историческим источником, а Store — единственным активным владельцем переданных planning-артефактов.

```mermaid
flowchart LR
  R3["Личный SHA R3: baseline + активный Change"] --> V["Проверенный перенос и provenance"]
  V --> S["Store: единственный активный владелец"]
  S --> C["Новый зависимый Change диапазона"]
  C --> H["Два человеческих review; код не менялся"]
```

## Подготовленный путь аналитика

Организатор выполняет импорт, зависимости и регистрацию по [отдельной инструкции](../organizer-stage-4.md). Аналитик начинает только с:

```bash
npm run bootstrap
opencode
```

Далее обязательны original MTP `grill-with-docs`, Explore при существенной развилке, Propose, ИИ-review и два последовательных человеческих review. Apply запускается отдельно только после принятия обоих Changes и нового разрешения на реализацию.

## Явное разрешение Store

Store identity хранится в `.openspec-store/store.yaml`. Регистрация — локальная связь ID с физическим checkout. Она не переносится через Git и не даёт доступа к чужой папке.

Каждая команда чтения унаследованного и нового Changes использует:

```bash
--store sdd-credit-calculator-product-meta
```

Перед работой проверяются `store list --json` и `store doctor ... --json`. Если ID указывает на другой root, операция останавливается; автоматическая перерегистрация запрещена. Временные acceptance-checkout используют отдельный `XDG_DATA_HOME`.

## Store-only только в персональной ветке сервиса

Будущий разработчик работает с двумя соседними папками:

```text
work/
  sdd-credit-calculator-product-meta-example/  # specs, Changes, tasks
  sdd-credit-calculator-example/               # src и runtime-тесты
```

После принятия обоих Changes разработчик создаёт персональную delivery-ветку сервиса. До удаления локальных planning-папок он сверяет source SHA, baseline, весь активный Change и Store. Только после подтверждённого переноса:

1. локальные `openspec/specs` и `openspec/changes` удаляются из персональной ветки сервиса;
2. `openspec/config.yaml` заменяется проверенным [`store-only-config.yaml`](../templates/store-only-config.yaml) с `store: sdd-credit-calculator-product-meta`;
3. команды с явным `--store` подтверждают ожидаемый root и оба Changes;
4. код и тесты меняются только в сервисном checkout; tasks — только в Store.

Общая `main` R3 остаётся repo-local. Нельзя поддерживать Store и локальные папки как два редактируемых контракта или использовать `.workspace` для реализации.

## Порядок реализации

После отдельного разрешения разработчик сначала выполняет унаследованный `add-reset-and-years-term`, затем зависимый `limit-credit-amount`. Для каждого Change сначала читаются `status` и `instructions apply`, после проверки отмечаются только реально выполненные tasks.

Полные команды и сообщения находятся в [`docs/developer-handoff.md` сервиса](https://github.com/apolenkov/sdd-guide-credit-calculator-stage-3/blob/main/docs/developer-handoff.md). Commit, push, merge, обновление `services.lock.yaml` и архивирование Changes не выполняются Store или Workset автоматически.

Workset остаётся необязательным списком папок; он не клонирует Git и не объединяет артефакты разных Changes.
