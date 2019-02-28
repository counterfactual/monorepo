#!/bin/sh

set -e

if [ ! -z "${IS_HEROKU_ENV}" ]; then
    echo "📟  Detected Heroku. Transpiling Typescript into JS for Node.JS to run on server."
    yarn workspace @counterfactual/playground-server add @counterfactual/node@latest
    yarn workspace @counterfactual/playground-server add @counterfactual/types@latest
    tsc -p tsconfig.heroku.json
fi
