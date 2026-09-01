# Продуктовый метарепозиторий · кредитный калькулятор

Это эталон ступени 3★: здесь находятся предметный контекст, OpenSpec и точная ссылка на отдельный учебный сервис. Кода сервиса и корпоративных данных в репозитории нет.

## Быстрый старт

macOS, Linux (Terminal/Bash):

```bash
git clone https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git
cd sdd-credit-calculator-product-meta-example
npm ci
make doctor
make bootstrap
make bootstrap
make validate
make start
```

Windows PowerShell:

```powershell
git clone https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git
Set-Location sdd-credit-calculator-product-meta-example
npm ci
npm run doctor
npm run bootstrap
npm run bootstrap
npm run check
npm run start
```

Linux без Make:

```bash
npm ci
npm run doctor
npm run bootstrap
npm run bootstrap
npm run check
npm run start
```

`npm run check` и `make validate` выполняют один полный gate: TypeScript typecheck, тесты, строгую проверку OpenSpec, privacy/secret scan и структурную проверку. Структурная проверка требует предварительного `bootstrap`.

`make bootstrap` загружает сервис в `.workspace/services/credit-calculator/` строго по полному SHA из `services.lock.yaml` и устанавливает зависимости по lock-файлу. Повторный запуск безопасен и проверяет тот же SHA, чистый Git status и точный URL `origin`. Эти же инварианты проверяются перед `validate` и `start`; несоответствие завершает команду ошибкой.

`make start` запускает проверенную закреплённую версию на <http://127.0.0.1:4173/>. Пока сервер работает, отдельная HTTP-приёмка запускается в другом терминале:

```bash
make acceptance-http
```

## Что проверять

- `CONTEXT.md` — строгий доменный словарь;
- `product.yaml` — границы продукта;
- `services.lock.yaml` — URL и полный SHA сервиса;
- `openspec/` — действующая спецификация и предложение изменения;
- `skills/domain-clarification/` — порядок уточнения предметной области.

## Роли

Аналитик уточняет цель, границы и сценарии. Архитектор проверяет связи и реализуемость. Разработчик отвечает за сервис в его собственном репозитории. Агент предлагает изменения только после проверки контекста; решение принимает человек.

## GitLab

Если сервис размещён в GitLab, замените только URL в lock-файле на URL GitLab-репозитория и сохраните полный SHA. Зеркало и копирование кода не требуются.
