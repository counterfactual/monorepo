npm run coverage || true
cat coverage/lcov.info | ./node_modules/.bin/coveralls
