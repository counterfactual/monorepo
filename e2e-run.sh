#!/bin/bash

echo "(1/4) Running preflight checks and cleanups..."

if [ -z "$NVM_DIR" ];
then
  echo "  > Error: Please install nvm."
  exit
else
  echo "  > Found NVM"
  . $NVM_DIR/nvm.sh
  nvm use
fi

if [ -z "$NODE_EXTENDED_PRIVATE_KEY" ];
then
  echo "  > Error: Please set the NODE_EXTENDED_PRIVATE_KEY environment variable."
  exit
fi

if [ -z "$(which sqlite3)" ];
then
  echo "  > Warning: sqlite3 not found, be sure to clean up the Hub's DB manually."
else
  sqlite3 packages/simple-hub-server/test/test-db.sqlite "DELETE FROM users"
  echo "  > Cleaned up test DB"
fi

if [ -d "/tmp/greenboard" ];
then
  rm -rf /tmp/greenboard
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

