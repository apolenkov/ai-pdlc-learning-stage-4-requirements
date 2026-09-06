# Передача личного результата R3/3-ИИ в Store

## Источник требований

- Репозиторий R3: `https://github.com/apolenkov/sdd-guide-credit-calculator-stage-1.git`
- Ветка: `course/example/stage-3-ai-payment-summary`
- Planning source SHA: `307bfe46006a9f289b56d1ae2c156af92d9529d4`
- Это проверенный вход переноса, а не человеческое одобрение.
- Main specs source/target: `openspec/specs/` — только `.gitkeep`, предметной main spec нет.
- Active Change source/target: `openspec/changes/add-reset-and-years-term/` — все 6 файлов, 23 сценария, 12 незавершённых задач.
- Active Change source/target: `openspec/changes/add-payment-summary/` — все 5 файлов, 10 сценариев, 9 незавершённых задач.
- Машинный inventory: [planning-provenance.json](planning-provenance.json), 12 файлов с Git blob OID и SHA-256. Состав сверяется с Git tree источника, а не только с этим перечнем.

## Отдельный контекст сервиса

- Репозиторий сервиса: `https://github.com/apolenkov/sdd-guide-credit-calculator-stage-3.git`
- Service context SHA in `services.lock.yaml`: `97d07d1c0723c1d9ac79a444bd120195877a01a8`
- `.workspace/services/credit-calculator` — только для чтения кода, без установки зависимостей сервиса.
- `.workspace/planning/stage-3` — только для проверки происхождения документов по SHA; это не второе место редактирования требований.
- Planning SHA не является версией приложения. Наличие снимка не доказывает реализацию 33 учебных сценариев.

## Человеческая приёмка

- [PR R3 №1](https://github.com/apolenkov/sdd-guide-credit-calculator-stage-1/pull/1) и [PR 3-ИИ №2](https://github.com/apolenkov/sdd-guide-credit-calculator-stage-1/pull/2) остаются отдельными учебными PR.
- Review требований другим аналитиком: ожидается.
- Review реализуемости разработчиком или архитектором: ожидается.
- Продолжение разрешено пользователем ради проверки гайда. Оно не означает одобрение PR, merge или выполнение задач.

## Сохранность и ownership

Все 33 сценария и 21 задача реализации сохраняются без изменения исходных файлов. Ни Apply, ни archive, ни sync main specs не выполняются. Унаследованная `traceability.md` остаётся историческим документом R3; текущая карта — [requirements-traceability.md](requirements-traceability.md).

Перенесены только planning-файлы. Код, runtime-тесты, зависимости и `.git` источника не импортированы в Store. Завершённый служебный Change `enforce-spec-centric-meta-contract` принадлежит истории шаблона и не является работой ученика; его выполненные задачи не входят в 21 незавершённую задачу.

Личная папка Store — единственное активное место изменения требований. Старая папка R1–R3 сохраняется как история и источник; `.workspace` не редактируется. Новый `limit-credit-amount` ещё не создан и должен учитывать оба унаследованных Change.
