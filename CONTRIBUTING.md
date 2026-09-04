# Сопровождение шаблона

## Полная локальная проверка

Используйте чистую копию репозитория:

```bash
npm ci
npm run setup
```

`setup` выполняет preflight, один bootstrap закреплённого сервиса и полный
`check`. Повторная ручная проверка без развёртывания: `npm run check`.

OpenSpec Store проверяется штатным CLI:

```bash
npm exec openspec -- store list --json
npm exec openspec -- store doctor sdd-credit-calculator-product-meta --json
```

Регистрацию рабочего checkout выполняет `setup-analysis-workspace`. Для
временного acceptance-checkout обязательно задавайте отдельный временный
`XDG_DATA_HOME` и удаляйте его после проверки: тест не должен менять
пользовательский реестр Store.

## Закреплённые MTP skills

В шаблоне хранится только `grill-with-docs` и его зависимости. Версия и хэши
зафиксированы в `.agents/mtp-skills.lock.json`.

```bash
npm run skills:check
npm run skills:update -- <полный-commit-sha>
```

Обновление принимает только полный SHA и должно проходить как отдельный
проверяемый diff. MTP `to-spec` не устанавливается: спецификация ведётся в
OpenSpec.

## Ручная проверка сервиса

```bash
npm run start
```

Пока сервер работает, в другом терминале:

```bash
npm run acceptance:http
```

Не редактируйте `.workspace/` и не добавляйте код сервиса в метарепозиторий.
Архитектура и опциональный Workset описаны в
[docs/architecture/openspec-store-workset.md](docs/architecture/openspec-store-workset.md).
