#!/bin/sh

set -e

if [ ! -z "${IS_HEROKU_ENV}" ]; then
    echo "📟  Detected Heroku. Transpiling Typescript into JS for Node.JS to run on server."
    tsc -p tsconfig.heroku.json &> /dev/null || :
fi
