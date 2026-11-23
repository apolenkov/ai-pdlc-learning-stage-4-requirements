---
name: setup-analysis-workspace
description: "Подготовить пару requirements/code этапа 4 после clone требований: зависимости, локальный Store и снимки. Использовать при явном вызове project skill пользователем."
---

# Подготовка окружения этапа 4

Один запуск готовит текущий checkout требований и соседний рабочий checkout кода.
Это не реализация: не создавайте Change или рабочие ветки, не меняйте требования,
код, tasks, service pin или провайдера; не выполняйте commit, push, Apply, archive
или sync. `.workspace/` — read-only снимки, не рабочий код.
Если пользователь разрешил только dependencies/setup, выполните только проверку
requirements и пункт 2, затем остановитесь. Skill не расширяет ограниченный запрос.

## 1. Подтвердите пару до изменений

Получите `git rev-parse --show-toplevel`, ветку, полный HEAD и
`git status --porcelain=v1 --untracked-files=all`. Покажите полный путь именно
`<git-root>/.agents/skills/setup-analysis-workspace/SKILL.md` и его base directory;
не используйте одноимённый глобальный skill. Прочитайте `AGENTS.md`, `README.md`,
`package.json`, `CONTEXT.md`, `product.yaml`, `.openspec-store/store.yaml`,
`openspec/config.yaml`, `services.lock.yaml` и `docs/course/planning-provenance.json`.
Проверьте опубликованную base-ветку и `IMPORT_BASE_SHA` по данным организатора. При
другом проекте, неподготовленной базе или непустом status — STOP без сброса,
удаления или коммита.

Без организатора данные организатора не требуйте: ученик собирает договор по
README, подраздел «Самостоятельно, без организатора». Base-ветка — личная
`course/<LOGIN>/stage-4-import-base` в fork, HEAD равен `IMPORT_BASE_SHA`.
`IMPORT_BASE_SHA` сверьте с `course/example/stage-4-import-base` исходного
репозитория курса, не fork:
`git ls-remote https://github.com/apolenkov/ai-pdlc-learning-stage-4-requirements.git refs/heads/course/example/stage-4-import-base`.
Расхождение или пустой вывод — STOP. `PLANNING_SHA`, `SERVICE_SHA` и
`REVIEW_REFERENCE` в этом маршруте берутся из manifest, `services.lock.yaml` и
`docs/course/stage-3-transfer.md` проверенной базы.

Возьмите Store ID из `store.yaml`, repository и полный service SHA из
`services.lock.yaml`, planning SHA из manifest. Не подставляйте planning SHA
вместо service pin или `main`. Ожидается отдельный stage-4-code, не stage-3.
Покажите requirements root, repository, pin и соседний
`<parent-of-git-root>/ai-pdlc-learning-stage-4-code`. Иной code root
согласуйте отдельно, не выбирайте его молча.

До npm/Store проверьте существующий code-путь через `lstat`: symlink, обычный файл,
не-Git каталог или Git root, не равный этой папке, — STOP. Для существующего клона
проверьте origin (тот же repository), HEAD (точный service pin) и полный status
(пустой). Не делайте clone, switch, checkout, reset, pull или замену файлов. При
другом HEAD, даже чистом, остановитесь: это может быть начатая работа.

## 2. Подготовьте requirements

Из requirements root выполните `npm ci`, затем ровно один `npm run setup`.
При ошибке остановитесь: сообщите исходную команду, exit status и причину;
не меняйте dependencies, package или lock-файл ради зелёного результата.
Повторите полный status — он должен оставаться пустым.

Не повторяйте успешные команды при продолжении этой подготовки, если в сессии есть
их exit 0 для того же realpath/HEAD/package-lock и зависимости не удалены или
изменены. Одна папка `node_modules` не доказывает успешный setup. Без подтверждения
выполните проверки, не выдавая старый результат за текущий. Это правило действует
и для установки/проверки кода ниже.

## 3. Скачайте рабочий код до регистрации Store

Только при отсутствующем code-пути (повторно проверьте перед clone) выполните
следующие команды, подставив проверенные буквальные значения из шага 1:

```bash
git clone --no-checkout <repository> <code-root>
git -C <code-root> cat-file -e <service-sha>^{commit}
git -C <code-root> checkout --detach <service-sha>
```

Если pin не получен при clone, разрешён один
`git -C <code-root> fetch origin <service-sha>` именно в новом клоне, затем
повторная проверка pin. При иной ошибке остановитесь, сохраните частичный clone и
покажите путь; не удаляйте его и не клонируйте поверх. Проверьте actual Git root,
origin, HEAD и полный status. Новый checkout остаётся detached на pin; рабочая
ветка создаётся позже отдельным действием перед реализацией. Существующую ветку
не переключайте.

Прочитайте code `AGENTS.md`, `package.json`, `openspec/config.yaml`. Ожидается
pointer на выбранный Store ID без локальных specs/changes. Несоответствие — STOP
без правки config. Из code root выполните `npm ci` и `npm run check:code`;
сохраните исходные exit status и проверьте чистоту. При ошибке не продолжайте к
Store.

## 4. Настройте локальную привязку Store

Из requirements root выполните `npm exec openspec -- store list --json`.
Сравнивайте канонические абсолютные пути через `realpath`. Ошибка CLI,
некорректный JSON, неоднозначная запись или недоступный root — STOP, а не
отсутствие регистрации.

- Записи нет: явный запрос полной подготовки разрешает регистрацию текущего
  checkout: `npm exec openspec -- store register . --id <store-id> --yes --json`.
- Root совпадает: переиспользуйте запись без register/unregister.
- Root другой: покажите старый и новый пути и спросите разрешение переключить
  именно этот ID между ними. До явного ответа остановитесь без изменения реестра.
  Привязка общая на этом компьютере для всех сервисов с данным ID, но старая папка
  останется нетронутой. Общий запрос setup не разрешает заменить существующую
  запись.

Только после подтверждения точных ID/путей повторите store list и проверки чистоты
обоих checkout. Если запись изменилась после вопроса — STOP, согласуйте новое
состояние. Иначе из requirements root последовательно выполните:

```bash
npm exec openspec -- store unregister <store-id> --json
npm exec openspec -- store register . --id <store-id> --yes --json
```

При ошибке остановите изменения без автоматического rollback/повтора. Если
unregister прошёл, а register нет, повторите только read-only store list: сообщите
фактическое отсутствие записи либо её текущий root (её мог зарегистрировать
другой процесс). Если прочитать реестр не удалось, состояние неизвестно. Укажите
прежний путь и обе исходные ошибки/exit status. Файлы старого checkout не меняйте.
Выполните `npm exec openspec -- store doctor <store-id> --json`, затем снова store
list. Нужны healthy и realpath зарегистрированного root, равный requirements root.
Один healthy без совпадения root недостаточен.

## 5. Проверьте всю связку и остановитесь

Из requirements root выполните два отдельных реальных запуска:

```bash
npm run bootstrap
npm run bootstrap
```

Оба должны завершиться `bootstrap: PASS`; fixture-тесты из setup не заменяют их.
Проверьте planning/service HEAD по manifest/lock и полный Git status требований,
`.workspace/planning/stage-3`, `.workspace/services/credit-calculator` и рабочего
code root. Снимки не редактируйте даже при ошибке.

Из рабочего code root выполните `npm run check:store` и
`npm exec openspec -- list --json`. Нужны exit 0, `root.source = declared`,
выбранный Store ID и realpath разрешённого root, равный requirements root. Одного
`check:store` или списка Changes без проверки фактического root недостаточно.
Повторите полный status обоих рабочих checkout; status до и после пуст.

Сообщите пути двух рабочих папок, HEAD, Store ID/root, результаты setup,
check:code/check:store, двух bootstrap и чистоту. Успех: все исходные команды
завершились с кодом 0, status до и после пуст, обе папки связаны с правильным
Store. Перечислите команды, пропущенные по подтверждённому успеху.

Store хранится локально на компьютере, не в Git: привязку проверяют после clone
на новом компьютере или при смене папки, не на каждом запуске. Коммит после
настройки не нужен. Сообщите фактический результат и остановитесь; не начинайте
grill, Propose или реализацию автоматически.
