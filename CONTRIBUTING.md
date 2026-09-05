# Сопровождение метарепозитория

Аналитик получает уже готовую личную `course/your_login/stage-4-import-base`. Организаторская процедура импорта, регистрации и bootstrap описана в [отдельной инструкции](docs/organizer-stage-4.md); не переносите её шаги в основной путь аналитика.

Перед передачей среды организатор подтверждает:

- доступны Git, Node.js 22+, npm и OpenCode с корпоративной аутентификацией;
- выполнены `npm ci --include=dev` и `npm run setup`;
- Store ID зарегистрирован именно на подготовленную папку, а конфликтующая регистрация не перезаписана;
- baseline и весь активный `add-reset-and-years-term` импортированы из одного полного личного SHA R3;
- `services.lock.yaml`, `docs/course/stage-3-transfer.md` и импортированные артефакты согласованы;
- два запуска `npm run bootstrap` дают один закреплённый SHA и не меняют Git status;
- человеческие review не подменены автоматической проверкой.

`npm run setup` проверяет сам Store и не получает сервис. `npm run bootstrap` проверяет provenance, полноту унаследованного Change, незавершённые tasks, чистоту meta checkout, Store root и read-only snapshot; он не регистрирует Store, не устанавливает зависимости сервиса и ничего не исправляет автоматически.

После изменения файлов выполните:

```bash
npm run check
```

Проверка Store не доказывает реализацию учебных функций. Общая `main` R3 остаётся repo-local; Store-only переход разрешён только в отдельной персональной delivery-ветке после проверки переноса. Подробности — в [архитектуре](docs/architecture/openspec-store-workset.md).

MTP `grill-with-docs` и его зависимости закреплены в `.agents/mtp-skills.lock.json`. Обновление через `npm run skills:update` требует отдельного решения о версии и полном SHA. MTP `to-spec` не используется: OpenSpec остаётся единственным источником спецификаций.

Официальные OpenSpec workflows в `.opencode/skills` обновляйте штатными средствами OpenSpec, не редактируйте их вручную.
