# Подготовка и публикация personal import-base R4

Эту процедуру выполняет организатор в отдельном чистом checkout метарепозитория. Ученик не повторяет импорт: он клонирует уже опубликованную personal import-base. Процедура переносит весь фактический planning inventory выбранного Git SHA, но не код, dependencies или runtime-тесты сервиса.

## Входные данные

До начала зафиксируйте:

- `<LOGIN>` — логин ученика;
- `<PLANNING_SOURCE_CHECKOUT>` — соседний checkout результата R3 или R3-ИИ;
- `<PLANNING_SHA>` — его полный 40-символьный Git SHA;
- `<SERVICE_SHA>` — независимо выбранный полный SHA контекста сервиса;
- `<META_REPOSITORY_URL>` — HTTPS URL метарепозитория;
- `<REVIEW_REFERENCE>` — ссылки или точные ссылки на актуальные человеческие review.

Planning SHA описывает происхождение требований. Service SHA описывает версию кода для чтения. Это независимые роли: repository и SHA могут совпасть, но service pin выбирают и проверяют отдельно, а не копируют из planning provenance.

## 1. Проверьте источник и подготовьте staging

Откройте чистый maintenance-checkout метарепозитория, установите его зависимости и проверьте эталон:

```bash
git status --short --branch
npm ci
npm run setup
```

Источник планирования должен быть Git root, находиться ровно на `<PLANNING_SHA>`, иметь HTTPS origin без username/password и пустой status. Helper проверит эти условия до записи, не выводит отклонённый URL, найдёт весь `openspec/specs/` и все активные каталоги `openspec/changes/*`, кроме `archive`, потребует хотя бы один активный Change и pending-задачи в каждом `tasks.md`.

Создайте только новую staging-папку:

```bash
stage_parent="$(mktemp -d)"
staged_import="$stage_parent/import"
npm exec tsx -- scripts/prepare-course-import.ts stage \
  --source <PLANNING_SOURCE_CHECKOUT> \
  --commit <PLANNING_SHA> \
  --output "$staged_import"
```

Команда откажется перезаписывать существующий output. Она читает байты из Git tree указанного commit, а не из рабочей копии, и создаёт `docs/course/planning-provenance.json` с repository, SHA, списком активных Changes, путями, Git blob OID и SHA-256.

Проверьте staging до переноса:

```bash
find "$staged_import" -type f -print | sort
sed -n '1,240p' "$staged_import/docs/course/planning-provenance.json"
git -C <PLANNING_SOURCE_CHECKOUT> ls-tree -r --name-only <PLANNING_SHA> -- \
  openspec/specs openspec/changes
```

Сопоставьте manifest с Git tree и прочитайте каждую main spec, proposal, delta spec, design и tasks. Число Changes и файлов не фиксировано; `openspec/specs/` может содержать только `.gitkeep`. Если review относится к другому SHA, задача отмечена выполненной, Change пропал, появился смысловой конфликт или исходный inventory непонятен, остановитесь.

## 2. Создайте personal import-base и перенесите inventory

Начните от актуального согласованного ref универсального эталона:

```bash
git switch main
git pull --ff-only
git switch -c course/<LOGIN>/stage-4-import-base
git status --short --branch
```

Сначала удалите из personal base учебные specs и незавершённые служебные Changes самого шаблона. Архив истории эталона сохраните:

```bash
git rm -r -- openspec/specs
git ls-tree -d --name-only HEAD:openspec/changes
while IFS= read -r template_change; do
  if [ "$template_change" != "archive" ]; then
    git rm -r -- "openspec/changes/$template_change"
  fi
done < <(git ls-tree -d --name-only HEAD:openspec/changes)
```

До запуска цикла прочитайте список. Не применяйте команды вне чистой новой personal-ветки. Затем скопируйте только подготовленный inventory и manifest:

```bash
mkdir -p openspec/specs docs/course
cp -R "$staged_import/openspec/specs/." openspec/specs/
while IFS= read -r inherited_change; do
  if [ -e "openspec/changes/$inherited_change" ]; then
    echo "STOP: target Change already exists: $inherited_change" >&2
    exit 1
  fi
  cp -R "$staged_import/openspec/changes/$inherited_change" openspec/changes/
done < <(node -e '
  const manifest = require(process.argv[1]);
  for (const name of manifest.imports.activeChanges) console.log(name);
' "$staged_import/docs/course/planning-provenance.json")
cp "$staged_import/docs/course/planning-provenance.json" docs/course/
cp docs/templates/stage-3-transfer.md docs/course/stage-3-transfer.md
cp docs/templates/requirements-traceability.md docs/course/requirements-traceability.md
```

Заполните оба файла в `docs/course/` без оставшихся `<...>`. В transfer перечислите все активные Changes из manifest, `<PLANNING_SHA>`, отдельный `<SERVICE_SHA>` и фактические review. В traceability добавьте каждое унаследованное требование и сценарий; не подгоняйте строки под заранее заданное число.

Для новой personal import-base используйте сервис `https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-code.git` и отдельно проверенный полный `<SERVICE_SHA>` из актуального `services.lock.yaml` эталона. Planning provenance по-прежнему указывает на исходный результат R3 или R3-ИИ: не заменяйте его адресом нового сервиса и не записывайте planning SHA в service pin. Уже опубликованные личные базы и их pins не меняйте автоматически. В `openspec/config.yaml` не перечисляйте случайный фиксированный набор унаследованных Changes: источником служит manifest.

## 3. Проверьте точность переноса

Helper повторно применяет тот же контракт, что bootstrap, и ничего не исправляет:

```bash
npm exec tsx -- scripts/prepare-course-import.ts verify \
  --source <PLANNING_SOURCE_CHECKOUT> \
  --target .
npm exec openspec -- validate --all --strict --no-interactive
npm run check
git diff --check
git diff
git status --short
```

`verify` должен завершиться `course import: PASS`. Он отклоняет потерянный, лишний или изменённый импорт, неверный SHA, origin, manifest и service pin. Убедитесь отдельно, что перенос не содержит `.git`, `.workspace`, `node_modules`, исходный код или runtime-тесты.

Добавьте только personal import-base и прочитайте staged diff:

```bash
git add services.lock.yaml openspec/config.yaml openspec/specs \
  openspec/changes docs/course
git diff --cached
git diff --cached --check
git commit -m "docs: import personal planning contract"
git status --short --branch
```

## 4. Докажите bootstrap в изолированном Store registry

Не используйте пользовательский реестр организатора для acceptance. Создайте отдельный XDG root и зарегистрируйте только текущий checkout:

```bash
course_xdg="$(mktemp -d)"
XDG_DATA_HOME="$course_xdg" npm exec openspec -- store list --json
XDG_DATA_HOME="$course_xdg" npm exec openspec -- store register . \
  --id sdd-credit-calculator-product-meta --yes --json
XDG_DATA_HOME="$course_xdg" npm exec openspec -- store doctor \
  sdd-credit-calculator-product-meta --json
XDG_DATA_HOME="$course_xdg" npm exec openspec -- validate --all --strict \
  --no-interactive --store sdd-credit-calculator-product-meta
XDG_DATA_HOME="$course_xdg" npm run bootstrap
XDG_DATA_HOME="$course_xdg" npm run bootstrap
git status --short
git -C .workspace/planning/stage-3 status --short
git -C .workspace/services/credit-calculator status --short
```

Оба bootstrap должны завершиться `bootstrap: PASS`; три status — быть пустыми. Первый запуск получает planning snapshot по provenance и service snapshot по отдельному lock, второй доказывает идемпотентность. Fixture-тесты в `npm run check` не заменяют эти два запуска. Если commit недоступен по сети или проверка не прошла, personal base не готова к публикации.

## 5. Опубликуйте и передайте ученику

Только после всех проверок:

```bash
git rev-parse HEAD
git push -u origin course/<LOGIN>/stage-4-import-base
git ls-remote --heads origin course/<LOGIN>/stage-4-import-base
```

Передайте ученику `<META_REPOSITORY_URL>`, точное имя ветки, planning SHA и ожидаемый commit personal base. Ученик сам клонирует её в каноническую папку `sdd-credit-calculator-product-meta-example`, запускает `opencode` и вызывает project skill `setup-analysis-workspace`.
Для будущей реализации отдельно передайте URL сервиса из `services.lock.yaml`, его полный SHA и [инструкцию разработчика](https://github.com/apolenkov/sdd-guide-credit-calculator-stage-4-code/blob/main/docs/developer-handoff.md). Это не разрешает Apply и не требует заменять существующую рабочую папку ученика.

В пользовательской среде регистрация проверяется заново. Если Store ID отсутствует, ученик останавливается и получает явное разрешение организатора зарегистрировать именно этот checkout. Если ID указывает на другой root, требуется решение владельца среды: не выполняйте unregister/remove и не переназначайте регистрацию автоматически.

Публикация import-base не является человеческим review, реализацией `limit-credit-amount` или разрешением Apply.
