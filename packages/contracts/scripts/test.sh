#!/usr/bin/env bash

set -e

function clean {
  kill ${PID_FOR_GANACHE_CLI}
}

trap clean INT TERM EXIT

pkill -9 ganache-cli

ganache-cli \
  --defaultBalanceEther 10000 \
  --gasLimit 0xfffffffffff \
  --gasPrice 0x01 \
  --networkId 7777777 \
  &> /dev/null \
  &

PID_FOR_GANACHE_CLI=$!

yarn run truffle test --network ganache $1
