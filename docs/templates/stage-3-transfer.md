# Передача planning-контракта в personal import-base R4

Организатор копирует этот шаблон в `docs/course/stage-3-transfer.md` и заменяет все `<...>`. Machine-readable источником inventory служит соседний `planning-provenance.json`.

## Источники

- Planning source repository: `<PLANNING_SOURCE_REPOSITORY>`
- Planning source branch/ref: `<PLANNING_SOURCE_REF>`
- Planning source SHA: `<PLANNING_SHA>`
- Planning source workspace after bootstrap: `.workspace/planning/stage-3`
- Main specs source/target: `openspec/specs/`
- Active Change source/target: `openspec/changes/<INHERITED_CHANGE>/`
- Service source repository: `<SERVICE_SOURCE_REPOSITORY>`
- Service context SHA in `services.lock.yaml`: `<SERVICE_SHA>`

Повторите строку `Active Change source/target` для каждого имени из `planning-provenance.json#imports.activeChanges`. Planning SHA и service SHA описывают независимые роли. Repository и SHA могут совпасть, но service pin нельзя выводить из planning provenance без отдельной проверки.

## Review исходной версии

- Review требований: `<REVIEW_REFERENCE_OR_PENDING>`
- Review реализуемости: `<REVIEW_REFERENCE_OR_PENDING>`
- SHA, к которому относятся review: `<PLANNING_SHA>`

Автоматическая проверка и ИИ не считаются человеческим review. Если подтверждение ещё ожидается, напишите `pending`, не подставляйте фиктивную ссылку.

## Инвентарь и состояние

- Machine-readable inventory: `docs/course/planning-provenance.json`
- [ ] Manifest совпадает с Git tree `<PLANNING_SHA>` по всем путям, blob OID и SHA-256.
- [ ] Перенесён весь `openspec/specs/`, включая допустимый пустой каталог с `.gitkeep`.
- [ ] Перенесён каждый активный Change, кроме `archive`, со всеми его файлами.
- [ ] Во всех импортированных `tasks.md` implementation-задачи остались `- [ ]`.
- [ ] Имена, требования и проверки перечислены по фактическим файлам, без предположения о втором Change или фиксированном числе сценариев.
- [ ] `.git`, `.workspace`, dependencies, код сервиса и runtime-тесты не импортированы.
- [ ] `services.lock.yaml` хранит отдельный проверенный service SHA, а не planning SHA.

## Переход ownership

После публикации personal import-base этот Store становится единственным активным местом изменения импортированных specs и Changes. Planning source сохраняется как история и read-only provenance snapshot. Код сервиса остаётся в отдельном репозитории; `.workspace/services/credit-calculator` используется только для чтения. Новый Change R4 создаётся поверх импорта без редактирования унаследованных файлов и без Apply.
