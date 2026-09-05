# Прослеживаемость требований ступени 4

Скопируйте шаблон в `docs/course/requirements-traceability.md`. Организатор заполняет унаследованные строки; аналитик добавляет точные пути и task нового Change.

| Требование | Источник: repo + SHA + путь | Владеющий артефакт Store | Сценарий | Незавершённая task, если не реализовано | Проверка результата | Статус |
| --- | --- | --- | --- | --- | --- | --- |
| Очистка предыдущего результата при ошибке | `<R3_SOURCE>` | `openspec/specs/credit-calculator/spec.md` | `Ошибка очищает предыдущий результат` | не требуется только для доказанного baseline | существующий код/тест и ручной сценарий | `baseline only` |
| Переключатель режима срока | `<R3_SOURCE>` | `openspec/changes/add-reset-and-years-term` | `<INHERITED_SCENARIO>` | `<INHERITED_PENDING_TASK>` | ввод целых месяцев сохранён; переключатель `месяцы / годы` не запускает расчёт | `pending implementation` |
| Срок в годах | `<R3_SOURCE>` | `openspec/changes/add-reset-and-years-term` | `<INHERITED_SCENARIO>` | `<INHERITED_PENDING_TASK>` | шаг `0,5`, default `20`, `0,5→6`, `20→240` в целые месяцы | `pending implementation` |
| Reset в выбранном режиме | `<R3_SOURCE>` | `openspec/changes/add-reset-and-years-term` | `<INHERITED_SCENARIO>` | `<INHERITED_PENDING_TASK>` | reset работает в обоих режимах: сохраняет режим, возвращает `3 000 000 / 16 / 240 месяцев` либо `20 лет`, очищает ошибки и результаты без auto-recalc | `pending implementation` |
| Диапазон суммы | условие ступени 4 | `openspec/changes/limit-credit-amount` | `<NEW_SCENARIO>` | `<NEW_PENDING_TASK>` | `10 000` и `100 000 000` допустимы; `9 999` и `100 000 001` дают ошибку и очищают результат | `pending implementation` |

## Контроль полноты

- [ ] Все строки содержат конкретный source SHA и путь.
- [ ] Унаследованный Change полностью сохранён и прочитан явно.
- [ ] Новый Change ссылается на унаследованный как зависимость.
- [ ] Каждое не реализованное требование связано с task `- [ ]` и проверкой.
- [ ] Ни одна проверка документов не названа реализацией функции.
- [ ] Store — единственный активный владелец planning-артефактов.
