#!/usr/bin/env bash

# Exit script as soon as a command fails.
set -o errexit

testrpc_running() {
	testrpc_port=8545
  nc -z localhost "$testrpc_port"
}

start_testrpc() {
  node_modules/.bin/ganache-cli -i 777 --gasLimit 50000000 --port "$testrpc_port" > /dev/null &
  testrpc_pid=$!
}

if testrpc_running; then
  echo "Killing testrpc instance at port $testrpc_port"
  kill -9 $(lsof -i:$testrpc_port -t)
fi

echo "Starting our own testrpc instance at port $testrpc_port"
start_testrpc
sleep 5

set +e

truffle test --network ganache "$@"

kill -9 $testrpc_pid
