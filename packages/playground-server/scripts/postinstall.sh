#!/bin/sh

set -e

if [ ! -z "${IS_HEROKU_ENV}" ]; then
    echo "Deleting ./node_modules/websocket/.git -- incorrectly added installation artifact"
    rm -rf ./node_modules/websocket/.git
fi
