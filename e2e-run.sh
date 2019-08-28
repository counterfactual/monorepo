#!/bin/bash

echo "(1/4) Running preflight checks and cleanups..."

if [ -z "$NODE_EXTENDED_PRIVATE_KEY" ];
then
  echo "  > Error: Please set the NODE_EXTENDED_PRIVATE_KEY environment variable."
  exit
fi

HUB_TEST_DB="packages/simple-hub-server/test/test-db.sqlite"

# Try to use a system installation of sqlite3.
if [ -z "$(which sqlite3)" ];
then
  # No sqlite3 client is installed.
  if [ -f "$HUB_TEST_DB" ];
  then
    # Remove the DB file if it exists.
    rm $HUB_TEST_DB
  fi

  # Use Node bindings to create the DB file.
  node -e "const { Database } = require('sqlite3'); const db = new Database('$HUB_TEST_DB');"
else
  # sqlite3 is installed. Use it to remove the `users` table.
  sqlite3 $HUB_TEST_DB "DROP TABLE IF EXISTS users"
  echo "  > Cleaned up test DB"
fi

if [ -d "packages/greenboard/chrome-profile" ];
then
  rm -rf packages/greenboard/chrome-profile
  echo "  > Cleaned up Chrome test user profile"
fi

echo "(2/4) Running Wallet UI & Hub API..."
yarn run:wallet:e2e &

echo "(3/4) Running tests..."
cd packages/greenboard
yarn start

echo "(4/4) Shutting down..."
killall -9 node
killall -9 chromedriver

echo "Finished!"
