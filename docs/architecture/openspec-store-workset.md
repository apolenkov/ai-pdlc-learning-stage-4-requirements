# OpenSpec Store и Workset

## Решение

Метарепозиторий — канонический OpenSpec Store. В нём хранятся `CONTEXT.md`,
продуктовые границы, `openspec/specs/` и `openspec/changes/`. Репозиторий
сервиса хранит код и тесты. Один Change описывает ожидаемое поведение, а
реализация проходит отдельным PR в сервисном репозитории.

Store использует встроенную схему
[`spec-driven`](https://openspec.dev/docs/schemas/spec-driven). Proposal
называет мотив, изменение, затронутые capabilities и impact; specs фиксируют
поведение, design — только нужные решения, tasks — последовательность работы.
Для изменения требования существующей возможности указывается её точный путь в
`Modified Capabilities`, а не создаётся новая capability.

```text
Jira
  └─ ссылка на Change в Store
       ├─ Store: specs + proposal/design/tasks + task state
       └─ Workset: Store + writable service clone
                         └─ service PR: code + tests
                              └─ merge → новый service SHA
                                   └─ Store PR: services.lock.yaml → setup/check
```

`.workspace/services/credit-calculator/` — не рабочая директория, а чистый
checkout закреплённого SHA для воспроизводимой проверки. Его нельзя включать в
Workset как writable member и нельзя менять вручную.

## Как это использовать

Store имеет проверяемую identity в `.openspec-store/store.yaml` и живёт в Git:
его изменения коммитятся, пушатся и ревьюятся как обычный репозиторий.

Workset сохраняется только на машине разработчика. Он объединяет Store и
рабочий клон сервиса в одном окне редактора; ни в один из репозиториев запись о
Workset не попадает. Это даёт агенту полный контекст, но не объединяет Git
истории и не переносит изменения автоматически.

Минимальная настройка для двух соседних клонов:

```bash
npm exec openspec -- store register .
npm exec openspec -- workset create credit-calculator \
  --member service=../sdd-credit-calculator-example \
  --member meta-store=. \
  --tool code
npm exec openspec -- workset open credit-calculator
```

OpenSpec 1.12 открывает Workset в VS Code или Cursor, но не запускает OpenCode
как opener. Для планирования OpenCode запускается из корня Store. Для Apply —
из терминала участника `service`: корневой `openspec/config.yaml` сервиса
разрешает тот же Store, а Store-aware skills находятся в `.opencode/skills/`
обоих репозиториев. Workset лишь делает две Git-границы видимыми в одном окне.

В Store выполняются `propose`, проверка и учёт задач Change. В Workset агент
читает Change из Store, а код и тесты меняет только в service clone. После
реализации создаётся service PR. После его merge новый полный SHA переносится в
`services.lock.yaml` отдельным Store PR; проверка выполняется из свежего клона
Store командами `npm run setup` и `npm run check`, затем Change архивируется.

## Почему beta и что не обещаем

Store и Workset — beta-возможности OpenSpec 1.12. OpenSpec не выполняет Git
clone/pull/push и не гарантирует синхронность checkout-ов. Поэтому remote,
ветка, merge и обновление lock-файла остаются явными шагами процесса.

Это не второй источник требований: Jira хранит ссылку и статус, Store —
спецификацию и Change, сервис — реализацию и тесты, lock — точный проверенный
снимок сервиса.

Официальные ссылки: [Stores](https://openspec.dev/docs/stores) и
[Worksets](https://openspec.dev/docs/worksets).
