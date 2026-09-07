# Правила метарепозитория

## Роли и ветки

- Владелец эталона меняет общие инструкции и автоматизацию только в maintenance-ветке с отдельным review.
- Организатор готовит и публикует personal import-base из полного Git SHA ученика. Он не занимает локальную рабочую папку ученика и не выдаёт неподготовленную `main` за личную историю.
- Ученик сам клонирует опубликованную `course/<LOGIN>/stage-4-import-base`, затем работает в `course/<LOGIN>/stage-4-amount-limits`. Planning PR направляется в personal import-base, не в общую `main`; после двух человеческих review учебный PR закрывается без слияния.

Репозиторий хранит контекст продукта и спецификации, но не код сервиса. Не добавляйте токены, персональные данные, корпоративные документы, dependencies или `.workspace/`.

## Контекст перед изменением

Прочитайте `CONTEXT.md`, `product.yaml`, `services.lock.yaml` и `openspec/config.yaml`.

В personal import-base дополнительно прочитайте:

- `docs/course/planning-provenance.json`;
- `docs/course/stage-3-transfer.md` и `requirements-traceability.md`;
- весь `openspec/specs/`;
- каждый Change из `imports.activeChanges` manifest.

Импорт может содержать один Change после R3 или несколько после необязательных дополнений. Main specs могут не содержать предметной spec. Не придумывайте baseline, фиксированное второе имя Change, число файлов, сценариев или задач. Все implementation tasks импортированных Changes должны оставаться pending до отдельного Apply.

## Порядок входа ученика

1. Клонировать опубликованную personal import-base в папку `sdd-credit-calculator-product-meta-example` и проверить branch/SHA/status.
2. Из этого корня запустить `opencode` и явно вызвать project skill `setup-analysis-workspace`. Skill выполняет `npm ci`, один `npm run setup`, проверяет чистоту до и после и останавливается.
3. Проверить Store ID/root. Отсутствующая регистрация требует явного разрешения организатора; другой root — STOP без unregister/remove или автоматического переназначения.
4. При правильном root выполнить два отдельных `npm run bootstrap`, затем проверить чистоту meta, planning и service snapshots.
5. Только после этого создать рабочую ветку, пройти original `grill-with-docs`, при оставшейся существенной развилке OpenSpec Explore, затем OpenSpec Propose и человеческое review.

Setup skill не регистрирует Store, не запускает bootstrap и не продолжает workflow автоматически. Fixture-тесты из `npm run check` не считаются двумя реальными bootstrap.

## Подготовка OpenSpec Change

1. Используйте original MTP `grill-with-docs` до явного подтверждения общего понимания.
2. Если после grill остаётся существенная развилка, используйте OpenSpec Explore; иначе переходите к OpenSpec Propose.
3. Не придумывайте отсутствующие факты: оставляйте их открытыми вопросами и продолжайте интервью до явного подтверждения общего понимания.
4. OpenSpec Propose создаёт полный planning-набор и останавливается на человеческой проверке.
5. Apply запускается отдельно только после принятия; автоматический переход от Propose запрещён.
6. Новый `limit-credit-amount` явно зависит от каждого фактически импортированного активного Change.
7. Если прежний успешный сценарий на 101 ₽ конфликтует с минимумом 10 000 ₽, спросите пользователя о замене новой delta на 10 001 ₽ / 0% / 2 месяца. Не выбирайте и не переписывайте унаследованный файл молча.

Сверяйте итоговый договор по файлам: различайте незатронутые сценарии, явно заменённые ожидания и действительно новые сценарии. Для полного учебного примера это `31 + 2 + 5 = 38`, но это не универсальная константа.

OpenSpec — единственный источник спецификации. MTP `to-spec` не используется. Не создавайте локальный process skill, пересказывающий MTP или OpenSpec. Apply, archive и sync на аналитической ступени запрещены; код сервиса не меняется.

## Store и снимки

- Store ID — `sdd-credit-calculator-product-meta`; для чтения и validation указывайте `--store sdd-credit-calculator-product-meta` и сначала подтверждайте root.
- Planning provenance хранит отдельные repository/SHA/inventory/hash. `services.lock.yaml` содержит независимый service pin; planning SHA нельзя записывать как версию приложения.
- `.workspace/planning/stage-3` и `.workspace/services/credit-calculator` — read-only проверочные снимки, а не места редактирования planning или кода.
- Store и bootstrap не выполняют commit, push, merge, регистрацию или переназначение Store.
- Для будущего Apply разработчик использует отдельный рабочий checkout сервиса.

Изменения эталона должны пройти `npm run check`, `git diff --check` и человеческое review. Сохраняйте исходный exit status команд; не подменяйте его результатом `grep`, `tail` или pipeline.
