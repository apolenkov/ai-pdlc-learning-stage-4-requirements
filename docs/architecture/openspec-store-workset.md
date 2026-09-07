# Как связаны ступени 3, Store и реализация

## Накопительный контракт

| Артефакт | Активный владелец на ступени 4 | Статус |
| --- | --- | --- |
| Весь импортированный `openspec/specs/` | product-meta Store | фактический baseline источника; может не содержать предметной spec |
| Каждый Change из planning manifest | product-meta Store | унаследованный активный Change, implementation tasks `- [ ]` |
| `limit-credit-amount` | product-meta Store | новый зависимый Change, tasks `- [ ]` |
| Код и runtime-тесты | отдельный checkout сервиса | не меняются в аналитической ступени |
| `.workspace/services/credit-calculator` | meta, только read-only контекст | не место разработки |

Ступень 3 сначала работает repo-local. Организатор ступени 4 импортирует весь `openspec/specs/` и **все** активные Changes из конкретного личного SHA в Store. Завершённая ветка R3 становится историческим источником, а Store — единственным активным владельцем переданных planning-артефактов.

```mermaid
flowchart LR
  R3["Личный SHA R3/R3-ИИ: specs + все активные Changes"] --> V["Проверенный перенос и provenance"]
  V --> S["Store: единственный активный владелец"]
  S --> C["Новый зависимый Change диапазона"]
  C --> H["Два человеческих review; код не менялся"]
```

## Подготовленный путь аналитика

Организатор готовит, дважды проверяет и публикует personal import-base по [отдельной инструкции](../organizer-stage-4.md). Аналитик клонирует её в каноническую папку и начинает с OpenCode:

```bash
git clone --branch course/<LOGIN>/stage-4-import-base --single-branch \
  <META_REPOSITORY_URL> sdd-credit-calculator-product-meta-example
cd sdd-credit-calculator-product-meta-example
opencode
```

В OpenCode ученик явно вызывает `setup-analysis-workspace`: skill выполняет `npm ci` и `npm run setup`, проверяет чистоту и останавливается. Затем ученик проверяет Store root; отсутствующая регистрация требует разрешения организатора, конфликтующая — остановки без автоматического переназначения. Только после правильного root выполняются два `npm run bootstrap`, original MTP `grill-with-docs`, Explore при существенной развилке, Propose и два человеческих review. Apply запускается отдельно только после принятия зависимого договора и нового разрешения на реализацию.

## Явное разрешение Store

Store identity хранится в `.openspec-store/store.yaml`. Регистрация — локальная связь ID с физическим checkout. Она не переносится через Git и не даёт доступа к чужой папке.

Каждая команда чтения унаследованного и нового Changes использует:

```bash
--store sdd-credit-calculator-product-meta
```

Перед работой проверяются `store list --json` и `store doctor ... --json`. Если ID указывает на другой root, операция останавливается; автоматическая перерегистрация запрещена. Временные acceptance-checkout используют отдельный `XDG_DATA_HOME`.

## Готовый репозиторий кода R4

Будущий разработчик работает с двумя соседними папками:

```text
work/
  sdd-credit-calculator-product-meta-example/  # specs, Changes, tasks
  sdd-credit-calculator-stage-4-example/        # src и runtime-тесты
```

После принятия полного фактического набора Changes разработчик клонирует новый репозиторий кода и создаёт личную ветку от SHA в согласованном `services.lock.yaml`. В новом комплекте:

1. местных `openspec/specs` и `openspec/changes` в сервисе уже нет; переносить или удалять старые требования не нужно;
2. `openspec/config.yaml` уже содержит `store: sdd-credit-calculator-product-meta`;
3. `npm exec openspec -- list --json` без `--store` подтверждает `root.source: declared`, нужную папку product-meta и фактический набор Changes;
4. код и тесты меняются только в сервисном checkout; tasks — только в Store.

Общая `main` R3 остаётся repo-local и не меняется. Уже существующие личные пары и service pins не заменяются автоматически. Нельзя поддерживать Store и местные папки как два редактируемых контракта или использовать `.workspace` для реализации. Перед работой агенту явно разрешают доступ к обоим root и задают границы правок; указатель Store сам этих прав не даёт.

## Порядок реализации

После отдельного разрешения разработчик определяет порядок реализации по явным зависимостям всех импортированных Changes и `limit-credit-amount`. Для каждого Change сначала читаются `status` и `instructions apply`, после проверки отмечаются только реально выполненные tasks.

Полные команды и сообщения находятся в [`docs/developer-handoff.md` сервиса R4](https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-code/blob/main/docs/developer-handoff.md). Commit, push, merge, обновление `services.lock.yaml` и архивирование Changes не выполняются Store или Workset автоматически.

Workset остаётся необязательным списком папок; он не клонирует Git и не объединяет артефакты разных Changes.
