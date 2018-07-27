#!/usr/bin/env bash

# based on https://github.com/OpenZeppelin/openzeppelin-solidity/blob/master/scripts/test.sh

# Exit script as soon as a command fails.
set -o errexit

# Executes cleanup function at script exit.
trap cleanup EXIT

cleanup() {
  # Kill the ganache instance that we started (if we started one and if it's still running).
  if [ -n "$ganache_pid" ] && ps -p $ganache_pid > /dev/null; then
    kill -9 $ganache_pid
  fi
}

if [ "$SOLIDITY_COVERAGE" = true ]; then
  ganache_port=8555
else
  ganache_port=9545
fi

ganache_running() {
  nc -z localhost "$ganache_port"
}

start_ganache() {
  # We define 10 accounts with balance 1M ether, needed for high-value tests.
  # Based on "concert load couple harbor equip island argue ramp clarify fence smart topic"
  local accounts=(
    --account="0xf2f48ee19680706196e2e339e5da3491186e0c4c5030670656b0e0164837257d,1000000000000000000000000"
    --account="0x5d862464fe9303452126c8bc94274b8c5f9874cbd219789b3eb2128075a76f72,1000000000000000000000000"
    --account="0xdf02719c4df8b9b8ac7f551fcb5d9ef48fa27eef7a66453879f4d8fdc6e78fb1,1000000000000000000000000"
    --account="0xff12e391b79415e941a94de3bf3a9aee577aed0731e297d5cfa0b8a1e02fa1d0,1000000000000000000000000"
    --account="0x752dd9cf65e68cfaba7d60225cbdbc1f4729dd5e5507def72815ed0d8abc6249,1000000000000000000000000"
    --account="0xefb595a0178eb79a8df953f87c5148402a224cdf725e88c0146727c6aceadccd,1000000000000000000000000"
    --account="0x83c6d2cc5ddcf9711a6d59b417dc20eb48afd58d45290099e5987e3d768f328f,1000000000000000000000000"
    --account="0xbb2d3f7c9583780a7d3904a2f55d792707c345f21de1bacb2d389934d82796b2,1000000000000000000000000"
    --account="0xb2fd4d29c1390b71b8795ae81196bfd60293adf99f9d32a0aff06288fcdac55f,1000000000000000000000000"
    --account="0x23cb7121166b9a2f93ae0b7c05bde02eae50d64449b2cbb42bc84e9d38d6cc89,1000000000000000000000000"
  )

  if [ "$SOLIDITY_COVERAGE" = true ]; then
    node_modules/.bin/testrpc-sc --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}" > /dev/null &
  else
    node_modules/.bin/ganache-cli --gasLimit 0xfffffffffff --port "$ganache_port" "${accounts[@]}" > /dev/null &
  fi

  ganache_pid=$!
}

if ganache_running; then
  echo "Using existing ganache instance"
else
  echo "Starting our own ganache instance"
  start_ganache
  sleep 5
fi

if [ "$SOLC_NIGHTLY" = true ]; then
  echo "Downloading solc nightly"
  wget -q https://raw.githubusercontent.com/ethereum/solc-bin/gh-pages/bin/soljson-nightly.js -O /tmp/soljson.js && find . -name soljson.js -exec cp /tmp/soljson.js {} \;
fi

if [ "$SOLIDITY_COVERAGE" = true ]; then
  node_modules/.bin/solidity-coverage

  if [ "$CONTINUOUS_INTEGRATION" = true ]; then
    cat coverage/lcov.info | node_modules/.bin/coveralls
  fi
else
  node_modules/.bin/truffle test --network ganache "$@"
fi
