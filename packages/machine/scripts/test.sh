#!/usr/bin/env bash

set -e

ganache-cli \
  --defaultBalanceEther 10000 \
  --gasLimit 0xfffffffffff \
  --gasPrice 0x01 \
  --host ${HOST:-127.0.0.1} \
  --port ${PORT:-8546} \
  --quiet \
  > /dev/null \
  &

jest --detectOpenHandles $1

ps aux \
  | grep ganache-cli \
  | grep -v grep \
  | awk '{print $2}' \
  | xargs kill -9
