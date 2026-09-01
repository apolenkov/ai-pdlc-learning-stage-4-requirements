.PHONY: doctor bootstrap check validate start acceptance-http test

doctor:
	npm run doctor

bootstrap:
	npm run bootstrap

validate:
	npm run check

check:
	npm run check

start:
	npm run start

acceptance-http:
	npm run acceptance:http

test:
	npm test
