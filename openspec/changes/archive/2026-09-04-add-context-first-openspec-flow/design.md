## Context

Метарепозиторий уже содержит строгий `CONTEXT.md`, продуктовые границы, lock на полный SHA сервиса и spec-driven OpenSpec. Кастомный `domain-clarification` дублирует методику, которую дают MTP skills, поэтому удаляется. MTP `to-spec` не используется: OpenSpec остаётся единственным форматом спецификации. См. `proposal.md` и capability `context-first-change-flow`.

Исходник MTP исследован на commit `6654f6b60cd9d5be8b54c6fafe44346dabeb3b76`; лицензия MIT. Перед реализацией SHA MUST быть перепроверен и сохранён в provenance manifest.

## Goals / Non-Goals

**Goals:**

- сделать подготовку OpenSpec Change воспроизводимой и context-first;
- использовать оригинальную композицию MTP skills, сохранив их происхождение;
- иметь один понятный контракт переходов от идеи до OpenSpec Propose;
- проверять целостность flow локально.

**Non-Goals:**

- автоматически применять созданный Change;
- переносить код сервиса в метарепозиторий;
- заменять OpenSpec артефактом MTP `to-spec`;
- автоматически создавать внешние записи или публиковать изменения;
- импортировать весь репозиторий MTP без необходимости.

## Decisions

### 1. Vendoring минимального замкнутого поднабора MTP

`npm run skills:install` читает закреплённый SHA из provenance manifest и воспроизводимо синхронизирует в `.agents/skills/` оригинальные каталоги `grill-me`, `grill-with-docs`, `grilling`, `domain-modeling` и `research`. `prototype` устанавливается и проверяется как самостоятельный skill. Копируются целые каталоги skills, включая относительные шаблоны, а не только `SKILL.md`; `setup-matt-pocock-skills` не импортируется.

Рядом хранится machine-readable provenance manifest: upstream URL, полный commit SHA, перечень импортированных путей и хэши файлов; MIT notice сохраняется без изменений. `npm run skills:update -- <full-sha>` — единственный штатный путь смены версии: он требует полный SHA, пересобирает snapshot и manifest, после чего запускает проверку provenance. Product-specific skills не входят в управляемый импорт и не удаляются.

Альтернатива — запускать `npx skills@latest add` при каждом использовании. Она отклонена: плавающая версия делает учебный эталон невоспроизводимым и требует сети.

### 2. AGENTS-контракт связывает MTP и OpenSpec

В `AGENTS.md` добавляется короткий проверяемый контракт. Он не пересказывает MTP или OpenSpec и не создаёт кастомный skill, а определяет переходы:

```text
repo context
    ↓
grill-with-docs ── или ── grill-me
    ↓
openspec-explore? ── только при нерешённой развилке
    ↓
openspec-propose
    ↓
human review ── отдельный openspec-apply
```

Контракт фиксирует для каждой стадии вход, результат, gate и стоп-условие. Он MUST ссылаться на исходные skills вместо копирования их правил.

Альтернатива — отдельный локальный router-skill. Она отклонена по обратной связи: это ещё одна кастомная методика рядом с оригинальными MTP skills. Структурный TypeScript-гейт делает AGENTS-контракт проверяемым.

### 3. Продуктовый контекст — данные, а не второй process skill

Кастомный `skills/domain-clarification` удаляется. Flow сначала читает `CONTEXT.md`, `product.yaml` и lock, затем использует оригинальные MTP `grill-with-docs` и `domain-modeling`. `domain-modeling` изменяет только словарь и редкие ADR; технические требования остаются в OpenSpec.

### 4. OpenSpec остаётся единственным спецификационным форматом

MTP `to-spec` в исходный набор не включается: он образует второй источник истины. Результат grill и domain-modeling передаётся в стандартный `openspec-explore`/`openspec-propose`.

### 5. Gate проверяет структуру и смысловые маркеры

TypeScript-проверка валидирует provenance manifest, наличие dependency closure, ссылки router на стадии и отсутствие автоматического Apply. Затем выполняются существующие OpenSpec strict validation и privacy scan.

## Risks / Trade-offs

- [Upstream MTP изменится] → обновлять только отдельным Change с новым SHA, diff и повторной проверкой зависимостей.
- [Vendored skills расходятся с upstream] → хранить файл-хэши и не редактировать оригиналы; продуктовую адаптацию держать в отдельном router.
- [Grill превращается в бесконечный опрос] → завершать его, когда frontier пуст и пользователь подтвердил общее понимание.
- [MTP методика подменяет продуктовые факты] → AGENTS-контракт требует сначала прочитать канонические продуктовые документы; skill управляет вопросами, но не становится источником фактов.

## Migration Plan

1. Закрепить проверенный MTP commit и точный dependency closure.
2. Добавить npm-команды установки/обновления, импортировать исходные каталоги и MIT notice в `.agents/skills/` и provenance-файл.
3. Удалить кастомный `domain-clarification` и закрепить preflight по каноническим продуктовым документам.
4. Добавить AGENTS-контракт переходов.
5. Обновить `AGENTS.md`, `CONTRIBUTING.md`, README и TypeScript gate/tests.
6. Прогнать короткий синтетический Change и сценарий с Explore.
7. Выполнить `npm run check`; после человеческой проверки изменение можно принять отдельно.

Откат: удалить новые project-local MTP skills/config и восстановить прежний список обязательных файлов в validator. Спецификация сервиса и lock SHA при этом не меняются.
