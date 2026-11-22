# Передача planning-контракта в personal import-base шагов 4–5

Организатор заполнил этот файл по шаблону `docs/templates/stage-3-transfer.md`, подставив фактические значения импорта. Machine-readable источником inventory служит соседний `planning-provenance.json`.

## Источники

- Planning source repository: `https://github.com/apolenkov/sdd-guide-credit-calculator-stage-1.git`
- Planning source branch/ref: `course/example/stage-3-ai-payment-summary`
- Planning source SHA: `a304386b1a33d160cbc297de2812ddeaeddfe380`
- Planning source workspace after bootstrap: `.workspace/planning/stage-3`
- Main specs source/target: `openspec/specs/` — в источнике только `.gitkeep`, предметной main spec нет
- Active Change source/target: `openspec/changes/add-payment-summary/` — 5 файлов, 3 требования, 10 сценариев, 9 задач `- [ ]`
- Active Change source/target: `openspec/changes/add-reset-and-years-term/` — 6 файлов, 7 требований, 23 сценария, 12 задач `- [ ]`
- Service source repository: `https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-code.git`
- Service context SHA in `services.lock.yaml`: `10c1ccab5e75178a2fcc14bdabeed81dad968ce0`

Повторите строку `Active Change source/target` для каждого имени из `planning-provenance.json#imports.activeChanges`. SHA планирования и service SHA описывают независимые роли. Repository и SHA могут совпасть, но service pin нельзя выводить из planning provenance без отдельной проверки.

## Review исходной версии

- Review требований: `pending`
- Review реализуемости: `pending`
- SHA, к которому относятся review: `a304386b1a33d160cbc297de2812ddeaeddfe380`

Автоматическая проверка и ИИ не считаются человеческим review. Если подтверждение ещё ожидается, напишите `pending`, не подставляйте фиктивную ссылку.

## Инвентарь и состояние

- Machine-readable inventory: `docs/course/planning-provenance.json`
- [x] Manifest совпадает с Git tree `a304386b1a33d160cbc297de2812ddeaeddfe380` по всем путям, blob OID и SHA-256.
- [x] Перенесён весь `openspec/specs/`, включая допустимый пустой каталог с `.gitkeep`.
- [x] Перенесён каждый активный Change, кроме `archive`, со всеми его файлами.
- [x] Во всех импортированных `tasks.md` implementation-задачи остались `- [ ]`.
- [x] Имена, требования и проверки перечислены по фактическим файлам, без предположения о втором Change или фиксированном числе сценариев.
- [x] `.git`, `.workspace`, dependencies, код сервиса и runtime-тесты не импортированы.
- [ ] `services.lock.yaml` хранит отдельный проверенный service SHA, а не planning SHA.

## Переход ownership

После публикации personal import-base этот Store становится единственным активным местом изменения импортированных specs и Changes. Источник планирования сохраняется как история и read-only provenance snapshot. Код сервиса остаётся в отдельном репозитории; `.workspace/services/credit-calculator` используется только для чтения. Новый Change R4 создаётся поверх импорта без редактирования унаследованных файлов и без Apply.
