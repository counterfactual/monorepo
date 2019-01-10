#!/usr/bin/env bash

set -e

trap "exit" INT TERM
trap "kill 0" EXIT

if lsof -ti :8545
then
  echo "Detected a process (probably an existing ganache instance) listening on 8545. Exiting."
  exit 1
fi

ganache-cli \
  --defaultBalanceEther 10000 \
  --gasLimit 0xfffffffffff \
  --gasPrice 0x01 \
  --networkId 7777777 \
  &> /dev/null \
  &

yarn run truffle test --network ganache $1
