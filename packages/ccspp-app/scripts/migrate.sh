#!/usr/bin/env bash

set -e

function clean {
  kill ${PID_FOR_GANACHE_CLI}
}

trap clean INT TERM EXIT

if [[ $(command -v lsof) && $(lsof -ti :8545) ]]
then
  echo "Detected a process (probably an existing ganache instance) listening on 8545. Exiting."
  exit 1
fi

ganache-cli \
  --defaultBalanceEther 10000 \
  --gasLimit 0xfffffffffff \
  --gasPrice 0x01 \
  --networkId 31415926 \
  &> /dev/null \
  &

PID_FOR_GANACHE_CLI=$!

yarn run truffle migrate --network=ganache
