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

Тот же путь можно поручить Codex: вызовите `$setup-analysis-workspace` в корне метарепозитория. Канонический skill уже находится в `.agents/skills/setup-analysis-workspace`, поэтому отдельно устанавливать его в шаблон не нужно. Он выполнит `npm ci`, дважды запустит `npm run setup` и проверит, что не появилось неожиданных изменений.

Ручной запасной путь:

```bash
npm run doctor
npm run skills:install
npm run bootstrap
npm run bootstrap
npm run check
```

`npm run skills:install` устанавливает project-local MTP skills из закреплённого SHA, а `npm run bootstrap` загружает закреплённый сервис. Второй запуск `bootstrap` проверяет идемпотентность. `npm run check` выполняет TypeScript typecheck, тесты, проверку MTP provenance, строгую проверку OpenSpec, privacy/secret scan и структурную проверку.

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


## Роли

Аналитик уточняет цель, границы и сценарии. Архитектор проверяет связи и реализуемость. Разработчик отвечает за сервис в его собственном репозитории. Агент предлагает изменения только после проверки контекста; решение принимает человек.

## GitLab

Если сервис размещён в GitLab, замените только URL в lock-файле на URL GitLab-репозитория и сохраните полный SHA. Зеркало и копирование кода не требуются.
