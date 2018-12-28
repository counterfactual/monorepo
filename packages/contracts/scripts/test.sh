#!/usr/bin/env bash

set -e

function clean {
  kill ${PID_FOR_GANACHE_CLI}
}

trap clean INT TERM EXIT

ganache-cli \
  --defaultBalanceEther 10000 \
  --gasLimit 0xfffffffffff \
  --gasPrice 0x01 \
  --networkId 7777777 \
  --quiet \
  &> /dev/null \
  &

PID_FOR_GANACHE_CLI=$!

yarn run tsc -p .

yarn run truffle test --network ganache $1
