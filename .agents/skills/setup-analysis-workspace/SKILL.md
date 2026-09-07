---
name: setup-analysis-workspace
description: "Подготовить свежий учебный checkout метарепозитория после clone. Использовать при явном вызове пользователем через $setup-analysis-workspace."
---

# Подготовка checkout анализа

Работайте только в открытом метарепозитории. Прочитайте `AGENTS.md`, `README.md` и `package.json`; команды берите из `package.json`.

1. Покажите Git root, текущую ветку и `git status --porcelain=v1 --untracked-files=all`. Если status не пуст или открыт другой проект, остановитесь. Не сбрасывайте, не удаляйте и не коммитьте чужую работу.
2. Выполните `npm ci`, затем ровно один раз `npm run setup`. При ошибке остановитесь и сообщите исходную команду, её exit status и причину; не меняйте dependencies, package или lock-файл ради зелёного результата.
3. Повторите полный Git status. Успех означает: обе команды завершились с кодом 0, а status до и после пуст.
4. Сообщите фактический результат и остановитесь. Следующий шаг определяет пользователь по README.

Не регистрируйте и не переназначайте OpenSpec Store, не запускайте bootstrap, не создавайте ветку или Change и не выполняйте commit, push, Apply, archive или sync. Этот skill не подтверждает доступность модели, Store root, planning/service snapshots или человеческое review.
