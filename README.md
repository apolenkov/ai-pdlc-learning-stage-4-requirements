# Продуктовый метарепозиторий · кредитный калькулятор

Эталон ступени 3★: здесь хранятся продуктовый контекст, OpenSpec и ссылка на
отдельный учебный сервис. Кода сервиса и корпоративных данных здесь нет.

## Начать обучение

Клонируйте метарепозиторий и создайте свою ветку:

```bash
git clone https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git
cd sdd-credit-calculator-product-meta-example
git switch -c feature/limit-credit-amount
opencode
```

В OpenCode выберите корпоративного агента **Build** и отправьте сообщение:

> Через встроенный инструмент `skill` загрузи project skill с ID
> `setup-analysis-workspace` из
> `.agents/skills/setup-analysis-workspace/SKILL.md`. Выполни этот skill целиком
> для текущего метарепозитория и остановись после итогового отчёта.

Skill уже входит в репозиторий. Он устанавливает зависимости, проверяет
локальную среду по `services.lock.yaml` и настраивает регистрацию OpenSpec Store.
Эта регистрация хранится только на текущем компьютере и не попадает в Git.
Внутренние команды вручную повторять не нужно.

Среда готова, когда в отчёте skill указано: setup завершился с `PASS`, Store
doctor не нашёл ошибок, `git status` остался пустым. Затем продолжайте с
готовым сообщением для `grill-with-docs` в
[гайде ступени 3★](https://apolenkov.github.io/customdev-learning/guides/stage-3-star.html).
Чтобы продолжить позже, откройте прежнюю сессию в OpenCode Web или выполните
`/resume` в OpenCode TUI.

## Что где хранится

| Путь | Назначение |
| --- | --- |
| `CONTEXT.md` | Единый словарь предметной области. |
| `product.yaml` | Границы продукта и состав сервисов. |
| `services.lock.yaml` | URL и проверенный полный SHA сервиса. |
| `openspec/specs/` | Действующие требования. |
| `openspec/changes/` | Планируемые изменения требований. |
| `.openspec-store/store.yaml` | Identity метарепозитория как OpenSpec Store. |
| `.workspace/` | Игнорируемый снимок сервиса для анализа и проверок; не место для разработки. |

Полный SHA в `services.lock.yaml` нужен только для воспроизводимой проверки. Он
не является входом задачи Jira или реализации: разработчик начинает от
актуальной `main`, а новый SHA фиксируется после merge service PR.

## Путь ступени 3★

```text
Jira → grill-with-docs → Explore при открытой развилке → Propose
     → проверка Change людьми
```

На этом ступень завершена. Следующий необязательный маршрут:
`service PR → Store PR → archive`.

Store хранит общий план, репозиторий сервиса — код и тесты. OpenSpec Workset —
локальный список папок: он может открыть оба репозитория в одном окне, но не
объединяет и не синхронизирует их. Каноническая Mermaid-схема, роли артефактов
и команды Workset: [OpenSpec Store и Workset](docs/architecture/openspec-store-workset.md).

Команды сопровождения шаблона находятся в [CONTRIBUTING.md](CONTRIBUTING.md).
