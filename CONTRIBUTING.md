# Как менять метарепозиторий

1. Выполните `npm ci`, затем `npm run setup`. Команда проверит инструменты, установит закреплённые MTP skills и сервис, повторит bootstrap и запустит полный gate.
2. Прочитайте `CONTEXT.md`, `product.yaml`, `services.lock.yaml` и `AGENTS.md`.
3. Пройдите MTP grill. Если остаётся существенная развилка, используйте OpenSpec Explore; иначе переходите к Propose.
4. Создайте OpenSpec Propose и остановитесь на человеческой проверке. Не запускайте Apply автоматически.
5. Запустите `npm run doctor`, затем `npm run check`.
6. Не добавляйте исходный код сервиса: он живёт в отдельном репозитории.
7. Проверьте `git status` и убедитесь, что `.workspace/` не отслеживается.

Обновлять MTP можно только явно: `npm run skills:update -- <полный-commit-sha>`. После обновления проверьте diff lock-файла и `npm run check`.
