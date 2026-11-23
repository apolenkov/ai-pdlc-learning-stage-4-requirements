import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");

test("learner uses a fork-first fail-closed Git flow", async () => {
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  const contributing = await readFile(resolve(root, "CONTRIBUTING.md"), "utf8");
  const organizer = await readFile(resolve(root, "docs/organizer-stage-4.md"), "utf8");
  assert.match(readme, /Организатор готовит и публикует персональную ветку/u);
  assert.match(readme, /на GitHub, нажмите \*\*Fork\*\*[\s\S]*?снимите флажок\s+\*\*Copy the main branch only\*\*/u);
  assert.match(readme, /git clone --branch course\/<LOGIN>\/stage-4-import-base --single-branch \\\s+<FORK_REPOSITORY_URL> \\\s+ai-pdlc-learning-stage-4-requirements/u);
  assert.match(readme, /origin.*ваш fork/su);
  assert.match(readme, /git clone --no-checkout <FORK_REPOSITORY_URL>/u);
  assert.match(readme, /git remote add upstream <META_REPOSITORY_URL>/u);
  assert.match(readme, /test -z "\$existing_base"/u);
  assert.match(readme, /git fetch --no-tags upstream refs\/heads\/course\/<LOGIN>\/stage-4-import-base/u);
  assert.match(readme, /test "\$\(git rev-parse FETCH_HEAD\)" = "<IMPORT_BASE_SHA>"/u);
  assert.match(readme, /git push -u origin course\/<LOGIN>\/stage-4-import-base/u);
  assert.match(readme, /remote_ref=.*git ls-remote --heads origin[\s\S]*?test -n "\$remote_ref"[\s\S]*?remote_head=\$\{remote_ref%%\[\[:space:\]\]\*\}/u);
  assert.match(readme, /test "\$remote_head" = "<IMPORT_BASE_SHA>"/u);
  assert.doesNotMatch(readme, /remote add fork|push_remote=fork|git push[^\n]*upstream|git push[^\n]*\bmain\b|--force|ls-remote[^\n]*\|/u);
  assert.match(readme, /VS Code[\s\S]*?setup-analysis-workspace[\s\S]*?npm ci[\s\S]*?npm run setup/u);
  assert.match(readme, /course\/<LOGIN>\/stage-4-import-base/u);
  assert.match(readme, /course\/<LOGIN>\/stage-4-amount-limits/u);
  assert.match(readme, /[Оо]добрение[\s\S]*?владелец продукта[\s\S]*?Approve[\s\S]*?[Аа]налитик[\s\S]*?техлид[\s\S]*?интеграц[\s\S]*?системой банка[\s\S]*?архитектора приглашают через @/u);
  assert.match(readme, /смёржьте учебный PR в личную base-ветку/u);
  assert.match(readme, /git push -u origin "\$branch"[\s\S]*?test "\$remote_head" = "\$local_head"/u);
  assert.match(readme, /задачи реализации остаются `- \[ \]`/u);
  assert.match(contributing, /fork[\s\S]*?копированием всех веток[\s\S]*?клонирует свой fork/iu);
  assert.match(organizer, /XDG_DATA_HOME="\$course_xdg" npm run bootstrap\nXDG_DATA_HOME="\$course_xdg" npm run bootstrap/u);
  assert.match(organizer, /Публикация import-base не является человеческим review/u);
  assert.match(organizer, /if \[ -e "openspec\/changes\/\$inherited_change" \]; then[\s\S]*?STOP: target Change already exists[\s\S]*?exit 1[\s\S]*?cp -R/u);
});

test("self-study learner builds a personal base from the published example and uses two PR templates", async () => {
  const [readme, template, agents, skill] = await Promise.all([
    readFile(resolve(root, "README.md"), "utf8"),
    readFile(resolve(root, ".github/pull_request_template.md"), "utf8"),
    readFile(resolve(root, "AGENTS.md"), "utf8"),
    readFile(resolve(root, ".agents/skills/setup-analysis-workspace/SKILL.md"), "utf8"),
  ]);
  const sourceCheck = /git ls-remote https:\/\/github\.com\/apolenkov\/ai-pdlc-learning-stage-4-requirements\.git refs\/heads\/course\/example\/stage-4-import-base/u;
  assert.match(readme, /git fetch origin course\/example\/stage-4-import-base\n\s*git rev-parse FETCH_HEAD/u);
  assert.match(readme, /git switch -c course\/your_login\/stage-4-import-base FETCH_HEAD\n\s*git push -u origin course\/your_login\/stage-4-import-base/u);
  assert.match(readme, /Сверьте SHA с исходным репозиторием курса, а не со своим fork/u);
  assert.match(readme, sourceCheck);
  assert.match(readme, /Сравните его с выводом `git rev-parse FETCH_HEAD` из шага 3\. Совпал — это ваш `IMPORT_BASE_SHA`\. Не совпал — копия в fork устарела[\s\S]*?остановитесь, базу не создавайте/u);
  assert.match(readme, /grep '"commit"' docs\/course\/planning-provenance\.json\n\s*grep 'commit:' services\.lock\.yaml/u);
  for (const field of ["META_REPOSITORY_URL=https://github.com/apolenkov/ai-pdlc-learning-stage-4-requirements.git", "IMPORT_BASE_BRANCH=course/your_login/stage-4-import-base", "IMPORT_BASE_SHA=", "PLANNING_SHA=", "SERVICE_SHA=", "REVIEW_REFERENCE="]) {
    assert.ok(readme.includes(`   ${field}`), `self-study contract must include ${field}`);
  }
  for (const content of [agents, skill]) {
    assert.match(content, /Без организатора данные организатора не треб(?:овать|уйте)/u);
    assert.match(content, /«Самостоятельно, без организатора»/u);
    assert.match(content, /course\/example\/stage-4-import-base/u);
  }
  assert.match(agents, /`IMPORT_BASE_SHA` — SHA `course\/example\/stage-4-import-base` в исходном репозитории курса по `git ls-remote`, не в fork/u);
  assert.match(skill, sourceCheck);
  assert.match(skill, /Расхождение или пустой вывод — STOP/u);
  assert.match(agents, /1\. Получить у организатора `<META_REPOSITORY_URL>`, `IMPORT_BASE_BRANCH`, `IMPORT_BASE_SHA`, `PLANNING_SHA`, `SERVICE_SHA` и `REVIEW_REFERENCE`/u);
  assert.match(skill, /Проверьте опубликованную base-ветку и `IMPORT_BASE_SHA` по данным организатора/u);
  assert.match(readme, /целью PR анализа[^\n]*выберите личную базу `course\/your_login\/stage-4-import-base`/u);
  assert.match(readme, /### С организатором\n\nОрганизатор передаёт/u);
  assert.match(readme, /в GitLab шаблона `\.gitlab`\s+нет[\s\S]*?скопируйте раздел «Запрос 1»/u);
  assert.match(readme, /intents\/intent-2-credit-limit\.md/u);
  assert.match(readme, /изменён в системе банка[\s\S]*?без правки формулы/u);
  assert.match(readme, /как часто калькулятор получает обновлённый лимит[\s\S]*?недоступности системы банка/u);
  assert.match(template, /## Запрос 1: анализ[\s\S]*?target `course\/your_login\/stage-4-import-base`[\s\S]*?- \[ \]/u);
  assert.match(template, /Ссылка на обсуждение с архитектором обязательна/u);
  assert.match(template, /## Запрос 2: статусы задач после реализации[\s\S]*?target `main` своего fork[\s\S]*?- \[x\]/u);
  assert.match(template, /В GitLab шаблона `\.gitlab` нет/u);
  const statusRequest = template.slice(template.indexOf("## Запрос 2"));
  assert.match(statusRequest, /Новый коммит статусов содержит только статусы задач; полный diff до `main` включает и импортированную базу[^.]*и принятое изменение требований/u);
  assert.match(statusRequest, /- \[ \] `git show <SHA-коммита-статусов>` показывает только статусы задач/u);
  assert.doesNotMatch(statusRequest, /в diff только статусы задач/u);
  assert.match(statusRequest, /Разработчик открывает этот запрос одновременно с запросом кода/u);
  assert.doesNotMatch(statusRequest, /только после[^\n]*слияния/u);
  assert.match(statusRequest, /- \[ \] Техлид нажал Merge в `main` своего fork после проверки разработчика и подтверждения аналитика/u);
});

test("organizer hands off one complete immutable Stage 4 contract", async () => {
  const organizer = await readFile(resolve(root, "docs/organizer-stage-4.md"), "utf8");
  for (const field of [
    "META_REPOSITORY_URL",
    "IMPORT_BASE_BRANCH",
    "IMPORT_BASE_SHA",
    "PLANNING_SHA",
    "SERVICE_SHA",
    "REVIEW_REFERENCE",
  ]) {
    assert.match(organizer, new RegExp(`<${field}>`, "u"));
  }
  assert.match(organizer, /IMPORT_BASE_SHA=.*git rev-parse HEAD/u);
  assert.match(organizer, /remote_import_base_ref=.*git ls-remote --heads origin[\s\S]*?test -n "\$remote_import_base_ref"[\s\S]*?remote_import_base_sha=\$\{remote_import_base_ref%%\[\[:space:\]\]\*\}/u);
  assert.match(organizer, /test "\$remote_import_base_sha" = "\$IMPORT_BASE_SHA"/u);
  assert.match(organizer, /в GitLab[\s\S]*?fork[\s\S]*?все ветки/iu);
});

test("README numbered learner steps are sequential", async () => {
  const readme = await readFile(resolve(root, "README.md"), "utf8");
  const numbers = [...readme.matchAll(/^## (\d+)\./gmu)].map((match) => Number(match[1]));
  assert.ok(numbers.length >= 5);
  assert.deepEqual(numbers, numbers.map((_, index) => index + 1));
});
