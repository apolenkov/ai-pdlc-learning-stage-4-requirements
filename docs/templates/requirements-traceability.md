# Прослеживаемость требований personal R4

Организатор создаёт отдельную строку для каждого точного заголовка `### Requirement:` из файлов `spec.md`, перечисленных в `planning-provenance.json`. Для active Change статус такой строки — `pending implementation`, а task указывает на его `tasks.md`. Для main specs статус берут из доказанного состояния источника, не назначают `baseline` автоматически. Аналитик дополняет таблицу новым `limit-credit-amount`; существующие строки и унаследованные файлы не переписываются молча.

| Требование / сценарий | Источник: repo + SHA + путь | Владеющий артефакт Store | Состояние до R4 | Незавершённая task | Проверка результата | Решение / review |
| --- | --- | --- | --- | --- | --- | --- |
| `<INHERITED_REQUIREMENT_OR_SCENARIO>` | `<PLANNING_REPOSITORY>@<PLANNING_SHA>:<SOURCE_PATH>` | `<TARGET_PATH>` | `<BASELINE_OR_PENDING_IMPLEMENTATION>` | `<TASK_PATH_OR_NOT_APPLICABLE>` | `<EXACT_CHECK>` | `<REVIEW_REFERENCE_OR_PENDING>` |
| Допустимые границы суммы | условие R4 | `openspec/changes/limit-credit-amount/<DELTA_SPEC_PATH>` | `pending implementation` | `<NEW_PENDING_TASK>` | `10 000 ₽` и `100 000 000 ₽` допустимы | `<PENDING_REVIEW>` |
| Ошибка за границей суммы | условие R4 | `openspec/changes/limit-credit-amount/<DELTA_SPEC_PATH>` | `pending implementation` | `<NEW_PENDING_TASK>` | `9 999 ₽` и `100 000 001 ₽` дают ошибку и очищают все применимые рассчитанные результаты | `<PENDING_REVIEW>` |
| Конфликт прежнего успешного примера `101 ₽`, если он существует | `<ACTUAL_SOURCE_OR_NOT_APPLICABLE>` | `openspec/changes/limit-credit-amount/<DELTA_SPEC_PATH>` | `unresolved until grill` | `<NEW_PENDING_TASK_OR_NOT_APPLICABLE>` | только после явного согласия: новая MODIFIED delta использует `10 001 ₽ / 0% / 2 месяца`; ожидаемые результаты берутся из фактически импортированных capabilities | `<USER_DECISION_AND_REVIEW>` |

Повторите первую строку для каждого унаследованного требования и перечислите его сценарии в проверке результата. Поле источника содержит точные repository, SHA планирования и путь; владеющий артефакт — тот же импортированный `spec.md`. Если main specs пусты, не создавайте фиктивный baseline. Если импорт не содержит общей суммы или переплаты, не выдумывайте эти результаты для новой delta.

## Контроль полноты

- [ ] Все source-ссылки содержат repository, полный SHA и путь.
- [ ] Каждый Change из `imports.activeChanges` представлен в таблице; чужих или ожидаемых по шаблону имён нет.
- [ ] Каждое не реализованное требование связано с фактической task `- [ ]` и проверкой.
- [ ] Новый Change явно учитывает каждый применимый импортированный Change.
- [ ] Замена конфликтующего сценария оформлена новой delta только после ответа пользователя; унаследованный файл не изменён.
- [ ] Незатронутые, заменённые и новые сценарии считаются по фактическим файлам, без универсальной константы.
- [ ] Документальная validation не названа реализацией функции или человеческим review.
- [ ] Store — единственный активный владелец planning-артефактов; planning и service snapshots read-only.
