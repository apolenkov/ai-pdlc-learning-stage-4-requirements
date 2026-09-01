# Продуктовый метарепозиторий · кредитный калькулятор

Это эталон ступени 3★: здесь находятся предметный контекст, OpenSpec и точная ссылка на отдельный учебный сервис. Кода сервиса и корпоративных данных в репозитории нет.

## Быстрый старт

macOS, Linux (Terminal/Bash):

```bash
git clone https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-requirements.git
cd sdd-credit-calculator-product-meta-example
npm install
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
npm install
npm run doctor
npm run bootstrap
npm run bootstrap
npm run validate
npm run start
```

Linux без Make:

```bash
npm install
npm run doctor
npm run bootstrap
npm run bootstrap
npm run validate
npm run start
```

`make start` запускает безопасную проверку запуска и выводит границу сервиса; он не копирует и не изменяет исходный код продукта. `make bootstrap` загружает сервис в `.workspace/services/credit-calculator/` строго по SHA из `services.lock.yaml`. Если URL или SHA недоступны, команда завершается ошибкой и не подменяет версию текущей веткой.

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
