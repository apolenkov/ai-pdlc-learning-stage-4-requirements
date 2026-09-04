# Продуктовый метарепозиторий · кредитный калькулятор

Это эталон ступени 3★: здесь находятся предметный контекст, OpenSpec и точная ссылка на отдельный учебный сервис. Кода сервиса и корпоративных данных в репозитории нет.

## Быстрый старт

macOS, Linux (Terminal/Bash):

```bash
git clone https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git
cd sdd-credit-calculator-product-meta-example
npm ci
npm run setup
npm run start
```

Windows PowerShell:

```powershell
git clone https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git
Set-Location sdd-credit-calculator-product-meta-example
npm ci
npm run setup
npm run start
```

`npm run setup` запускается только из чистой копии. Команда последовательно выполняет preflight, проверяет закреплённые MTP skills, загружает сервис, повторно проверяет bootstrap и запускает полный локальный gate. Её можно безопасно выполнить ещё раз: версия, origin и чистота рабочей копии останутся прежними.

Тот же путь можно поручить корпоративному агенту OpenCode. Откройте корень
метарепозитория и отправьте сообщение: «Через встроенный инструмент `skill`
загрузи project skill с ID `setup-analysis-workspace`. Разверни и проверь
учебную среду; остановись после итогового отчёта setup». Skill уже находится в
`.agents/skills/setup-analysis-workspace`, устанавливать его отдельно не нужно.

`npm run check` выполняет TypeScript typecheck, тесты, проверку MTP provenance,
строгую проверку OpenSpec, privacy/secret scan и структурную проверку.

Установка и обновление MTP выполняются только через npm:

```bash
npm run skills:install
npm run skills:check
npm run skills:update -- <полный-commit-sha>
```

`skills-install` воспроизводит версию из `.agents/mtp-skills.lock.json`; `skills-check` проверяет локальные файлы без сети; `skills-update` принимает только полный SHA и создаёт явный diff версии, файлов и хэшей. MTP `to-spec` не устанавливается: спецификация ведётся только в OpenSpec.

`npm run bootstrap` загружает сервис в `.workspace/services/credit-calculator/` строго по полному SHA из `services.lock.yaml` и устанавливает зависимости по lock-файлу. Повторный запуск безопасен и проверяет тот же SHA, чистый Git status и точный URL `origin`. Эти же инварианты проверяются перед `check` и `start`; несоответствие завершает команду ошибкой.

`npm run start` запускает проверенную закреплённую версию на <http://127.0.0.1:4173/>. Пока сервер работает, отдельная HTTP-приёмка запускается в другом терминале:

```bash
npm run acceptance:http
```

## Что проверять

- `CONTEXT.md` — строгий доменный словарь;
- `product.yaml` — границы продукта;
- `services.lock.yaml` — URL и полный SHA сервиса;
- `openspec/` — действующая спецификация и предложение изменения;
- `.agents/skills/` — закреплённые оригинальные MTP skills;
- `docs/agents/domain.md` — правила чтения доменного контекста.

## Как подготовить Change

```text
CONTEXT/product/lock → grill-with-docs или grill-me
                     → OpenSpec Explore, только если осталась развилка
                     → OpenSpec Propose → проверка человеком
                     → отдельный OpenSpec Apply
```

## Эталонная multi-repo-схема OpenSpec

Этот репозиторий является OpenSpec Store: его `openspec/` содержит общие
спецификации и Changes, а имя и удалённый адрес Store зафиксированы в
`.openspec-store/store.yaml`. Код сервиса находится в отдельном репозитории.

В `openspec/config.yaml` выбрана стандартная схема
[`spec-driven`](https://openspec.dev/docs/schemas/spec-driven): `proposal.md`
фиксирует зачем и что меняется, delta specs — наблюдаемое поведение,
`design.md` — необходимые технические решения, `tasks.md` — проверяемую
работу. Для изменения `limit-credit-amount` используется существующая
capability `credit-calculator` в `Modified Capabilities`; новую capability
придумывать не нужно.

Для работы с кодом откройте Store и отдельный рабочий клон сервиса в одном
редакторе через Workset. Закреплённый `.workspace/services/credit-calculator/`
не редактируйте: это чистая проверочная копия из `services.lock.yaml`.
Project skills OpenSpec для OpenCode уже находятся в `.opencode/skills/`.

Однократно на машине:

Клонируйте сервис рядом с метарепозиторием, затем из корня метарепозитория
выполните команды ниже. Они не содержат входного SHA: разработка начинается с
актуальной `main`, а точный SHA фиксируется после merge.

```bash
cd ..
git clone https://github.com/apolenkov/sdd-guide-credit-calculator-stage-3.git
cd sdd-credit-calculator-product-meta-example
npm exec openspec -- store register .
npm exec openspec -- store doctor sdd-credit-calculator-product-meta
npm exec openspec -- workset create credit-calculator \
  --member service=../sdd-credit-calculator-example \
  --member meta-store=. \
  --tool code
```

Перед работой:

```bash
npm exec openspec -- workset open credit-calculator
npm exec openspec -- status --all --store sdd-credit-calculator-product-meta
```

Workset открывает обе папки в VS Code. Для планирования запустите OpenCode из
корня метарепозитория. Для Apply запустите его в терминале участника `service`:
корневой `openspec/config.yaml` сервиса разрешает этот Store, а код меняется в
правильной Git-истории. Для Workset используйте только `--tool code`: OpenSpec
1.12 не умеет запускать OpenCode как opener.

Store и сервис живут в разных Git-историях: сначала ревью и Change в Store,
затем реализация и тесты в рабочем клоне сервиса. После merge сервиса обновите
его полный SHA в `services.lock.yaml` отдельным изменением Store и проверьте
свежим клоном `npm run setup`. OpenSpec не клонирует, не pull-ит и не push-ит
репозитории автоматически.

Workset — локальный список папок: он хранится вне участников и не изменяет их.
Команды `npm exec openspec -- workset list` и
`npm exec openspec -- workset remove credit-calculator` управляют только этим
локальным списком. Store и Workset сейчас beta; если команда или формат
изменятся, сверяйтесь с официальной документацией OpenSpec.

Краткая схема и ограничения: `docs/architecture/openspec-store-workset.md`.


## Роли

Аналитик уточняет цель, границы и сценарии. Архитектор проверяет связи и реализуемость. Разработчик отвечает за сервис в его собственном репозитории. Агент предлагает изменения только после проверки контекста; решение принимает человек.

## GitLab

Если сервис размещён в GitLab, замените только URL в lock-файле на URL GitLab-репозитория и сохраните полный SHA. Зеркало и копирование кода не требуются.
