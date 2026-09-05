# Передача личного результата ступени 3 в Store

Скопируйте шаблон в `docs/course/stage-3-transfer.md` и замените все `<...>`. Этот файл входит в личную import-base R4.

## Источник

- Репозиторий R3: `https://github.com/apolenkov/sdd-guide-credit-calculator-stage-3.git`
- Ветка: `course/<LOGIN>/stage-3-reset-years`
- Полный SHA принятого результата: `<40_CHARACTER_R3_SHA>`
- Baseline source: `openspec/specs/credit-calculator/spec.md`
- Baseline target: `openspec/specs/credit-calculator/spec.md`
- Active Change source: `openspec/changes/add-reset-and-years-term/`
- Active Change target: `openspec/changes/add-reset-and-years-term/`
- Service context SHA in `services.lock.yaml`: `<40_CHARACTER_R3_SHA>`

## Подтверждения актуальной версии

- Review требований другим аналитиком: `<LINK_OR_REFERENCE>`
- Review реализуемости разработчиком или архитектором: `<LINK_OR_REFERENCE>`
- SHA обоих review: `<40_CHARACTER_R3_SHA>`

Автоматическая проверка и ИИ не являются этими подтверждениями.

## Инвентарь

Вставьте результат `git ls-tree -r --name-only <FULL_R3_SHA> -- openspec/specs/credit-calculator openspec/changes/add-reset-and-years-term` и подтвердите:

- [ ] перенесён весь baseline;
- [ ] перенесены `proposal.md`, delta spec, `design.md`, `tasks.md` и служебный файл Change, если он был в исходном SHA;
- [ ] задачи переключателя «месяцы / годы», перевода лет и reset в обоих режимах остались `- [ ]`;
- [ ] ввод целых месяцев сохранён; режим лет имеет шаг `0,5`, default `20 лет` и переводит `0,5→6`, `20→240` в целые месяцы;
- [ ] reset сохраняет выбранный режим, возвращает срок `240 месяцев` либо `20 лет`, очищает ошибки и результаты и не запускает расчёт;
- [ ] Change остался активным и не архивирован;
- [ ] исходный SHA не содержит реализации reset, переключателя срока или диапазона суммы;
- [ ] `.git`, `.workspace`, dependencies, `src`, `index.html`, styles и runtime-тесты не импортированы в Store.

## Переход ownership

После проверенного импорта эта personal base Store является единственным активным местом изменения specs и Changes. Исходная R3-ветка сохраняется как история. Будущая персональная delivery-ветка сервиса переводится в Store-only отдельно; общая `main` R3 остаётся repo-local.
