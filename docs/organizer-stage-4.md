# Подготовка личной базы ступени 4

Эту процедуру выполняет организатор до передачи папки аналитику. Она не является частью задания аналитика и не создаёт человеческие review автоматически.

## 1. Проверьте источник R3

Нужна сохранённая рабочая ветка `course/your_login/stage-3-reset-years` после двух актуальных review. Подставьте полный SHA и используйте соседний checkout:

```bash
git -C ../sdd-credit-calculator-example status --short --branch
git -C ../sdd-credit-calculator-example rev-parse HEAD
git -C ../sdd-credit-calculator-example cat-file -e <FULL_R3_SHA>^{commit}
git -C ../sdd-credit-calculator-example show <FULL_R3_SHA>:docs/course/stage-2-transfer.md
git -C ../sdd-credit-calculator-example show <FULL_R3_SHA>:docs/course/requirements-traceability.md
git -C ../sdd-credit-calculator-example ls-tree -r --name-only <FULL_R3_SHA> -- openspec/specs/credit-calculator openspec/changes/add-reset-and-years-term
```

Проверьте, что Change активен, все его файлы присутствуют, задачи переключателя «месяцы / годы», перевода лет и reset в обоих режимах не выполнены, а реализация в исходном SHA не изменялась. Если SHA недоступен, дерево грязное или review относится к другой версии, остановитесь.

## 2. Создайте личную import-base R4

Из чистой общей `main` meta:

```bash
git switch main
git pull --ff-only
git switch -c course/your_login/stage-4-import-base
npm ci --include=dev
npm run setup
```

Не включайте чужие локальные правки. Для повторного прохождения используйте одинаковый суффикс в personal base и последующей рабочей ветке.

## 3. Подготовьте перенос без перезаписи

Архив сначала раскрывается во временную папку. Команда не пишет в Store:

```bash
transfer_dir="$(mktemp -d)"
git -C ../sdd-credit-calculator-example archive <FULL_R3_SHA> \
  openspec/specs/credit-calculator/spec.md \
  openspec/changes/add-reset-and-years-term \
  | tar -x -C "$transfer_dir"
test ! -e openspec/changes/add-reset-and-years-term
git diff --no-index -- \
  openspec/specs/credit-calculator/spec.md \
  "$transfer_dir/openspec/specs/credit-calculator/spec.md"
```

Код возврата `1` у `git diff --no-index` означает содержательный diff, а не разрешение его принять. Сопоставьте каждый сценарий baseline и Change. При конфликте примите явное решение и запросите новые review изменённого содержания; не копируйте поверх неизвестного состояния.

После проверки перенесите только согласованные planning-артефакты:

```bash
cp "$transfer_dir/openspec/specs/credit-calculator/spec.md" \
  openspec/specs/credit-calculator/spec.md
cp -R "$transfer_dir/openspec/changes/add-reset-and-years-term" \
  openspec/changes/
mkdir -p docs/course
cp docs/templates/stage-3-transfer.md docs/course/stage-3-transfer.md
cp docs/templates/requirements-traceability.md \
  docs/course/requirements-traceability.md
```

Заполните оба файла в `docs/course`. В `services.lock.yaml` замените commit на тот же `<FULL_R3_SHA>`; repository и workspace не меняйте. В provenance перечислите исходные пути, полный SHA, review и file inventory.

## 4. Проверьте Store до регистрации

```bash
npm exec openspec -- validate add-reset-and-years-term --strict
npm run check
git diff --check
git diff
git status --short
```

Убедитесь, что импорт не содержит `.git`, `.workspace`, dependencies, исходный код или runtime-тесты. Затем сохраните только подготовленную personal base:

```bash
git add services.lock.yaml openspec/specs/credit-calculator/spec.md \
  openspec/changes/add-reset-and-years-term docs/course
git diff --cached
git commit -m "docs: import personal stage 3 contract"
git push -u origin course/your_login/stage-4-import-base
```

## 5. Проверьте регистрацию без перезаписи

```bash
npm exec openspec -- store list --json
```

Если ID `sdd-credit-calculator-product-meta` отсутствует, организатор может выполнить:

```bash
npm exec openspec -- store register . --id sdd-credit-calculator-product-meta --yes --json
```

Если ID уже указывает на эту папку, ничего не меняйте. Если он указывает на другой checkout, остановитесь и покажите оба пути владельцу среды. Не выполняйте unregister/remove и не переключайте регистрацию автоматически.

```bash
npm exec openspec -- store doctor sdd-credit-calculator-product-meta --json
npm exec openspec -- status --change add-reset-and-years-term --json --store sdd-credit-calculator-product-meta
```

## 6. Докажите повторяемость bootstrap

Только в чистой personal base:

```bash
npm run bootstrap
npm run bootstrap
git -C .workspace/services/credit-calculator rev-parse HEAD
git status --short
```

Оба запуска должны сообщить `bootstrap: PASS`: provenance, точный inventory и байты baseline и полного активного Change совпали с Git tree закреплённого SHA, а status остаётся пустым. Bootstrap не должен исправлять неполный или изменённый импорт, чужой baseline, грязный либо закреплённый на другом SHA snapshot.

После проверки передайте аналитику точный путь к папке и название `course/your_login/stage-4-import-base`. Аналитик начинает с `npm run bootstrap`, затем `opencode`; setup и импорт он не повторяет.

Для временной acceptance-проверки создайте отдельный checkout и отдельный `XDG_DATA_HOME`. Не регистрируйте временную копию в пользовательском реестре.
