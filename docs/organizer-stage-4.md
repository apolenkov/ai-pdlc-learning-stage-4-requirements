# Подготовка личной базы R4 после R3-ИИ

Это сопровождение текущей личной базы, не задание аналитика. Старые шаблоны в `docs/templates/` предполагают baseline и один Change; к этому переносу они неприменимы. Их общая переработка — отдельная задача курса.

## Два независимых источника

- Planning source: `sdd-credit-calculator-stage-1-example`, SHA `307bfe46006a9f289b56d1ae2c156af92d9529d4`.
- Service source: `sdd-credit-calculator-example`, SHA `97d07d1c0723c1d9ac79a444bd120195877a01a8`.
- Planning source и inventory закреплены в `docs/course/planning-provenance.json`; service source — отдельно в `services.lock.yaml`. Не заменяйте один SHA другим.

## Подготовка организатором

1. Проверить чистоту исходной личной папки, полный SHA и доступность коммита. Не переключать её ветку и не менять PR ради подготовки.
2. Создать новую папку meta и персональную ветку из проверенной версии шаблона. Не использовать чужой или грязный checkout. Выполнить `npm ci --include=dev` и `npm run setup` для самого Store, не сервиса.
3. Перенести из Git tree planning source весь `openspec/specs/` и все активные Changes, кроме archive, с точным сохранением байтов. Здесь main specs содержат только `.gitkeep`, а оба Change — 11 файлов. Удаление эталонной main spec в личной ветке допустимо после сверки; её история остаётся в Git. Не создавать фиктивный baseline и не архивировать учебные Changes.
4. В manifest записать все 12 путей, исходные Git blob OID и SHA-256, оба active Change. Проверять полноту по source tree, не только по самому списку. Заполнить `docs/course/stage-3-transfer.md` и `requirements-traceability.md`, оставив человеческие ревью ожидающими.
5. Согласовать README/AGENTS/CONTEXT/OpenSpec context с личным входом. Сохранить отдельно maintenance-коммит и коммит личной базы; проверить staged diff. Внешняя публикация в подготовку не входит.

Приёмка: `add-reset-and-years-term` — 23 сценария и 12 pending tasks; `add-payment-summary` — 10 и 9. Всего 33 и 21. Служебный завершённый Change шаблона не входит в учебный итог и не удаляется.

## Регистрация без перезаписи

Из выбранного meta root:

```bash
npm exec openspec -- store list --json
npm exec openspec -- store doctor sdd-credit-calculator-product-meta --json
```

Если ID указывает на эту папку, ничего не меняйте. Отсутствующая регистрация — отдельное разрешённое действие организатора. При другом root остановитесь и покажите оба пути владельцу. Не выполняйте unregister/remove и не переключайте регистрацию автоматически. Временные проверки используют отдельный `XDG_DATA_HOME`.

## Приёмка подготовленной базы

```bash
npm exec openspec -- validate add-reset-and-years-term --strict --store sdd-credit-calculator-product-meta
npm exec openspec -- validate add-payment-summary --strict --store sdd-credit-calculator-product-meta
npm run check
git diff --check
```

После сохранения, только в чистой personal base:

```bash
npm run bootstrap
npm run bootstrap
git -C .workspace/planning/stage-3 rev-parse HEAD
git -C .workspace/services/credit-calculator rev-parse HEAD
git status --short
```

Оба запуска должны подтвердить `bootstrap: PASS` и пустой Git status. Проверяются origin/SHA/чистота двух снимков, source inventory и байты импорта. Bootstrap не должен исправлять неполный или изменённый импорт, чужой baseline, грязный либо закреплённый на другом SHA snapshot. Зависимости сервиса не устанавливаются, код не запускается; оба снимка только для чтения.

SHA-256 manifest вычисляется для исходных Git blob; импорт сверяется по каноническому Git-содержимому с сохранением штатной нормализации LF/CRLF. В текущем переносе дополнительно проверены raw SHA-256 всех 12 рабочих файлов.

Передать аналитику точный путь и `course/example/stage-4-import-base`. Новый `limit-credit-amount` создаётся учеником после обсуждения через original `grill-with-docs`, не организатором при переносе. Apply и человеческое одобрение не выполняются.
