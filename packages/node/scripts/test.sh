#!/usr/bin/env bash

set -e

function clean {
  kill ${PID_FOR_GANACHE_CLI}
}

trap clean INT TERM EXIT

# Gets the val of a key=val pair by key specified in an env file
#
# Args:
#   $1 The key
#   $2 The filename
#   $3 Default value if value does not exist
read_var() {
  VAR=$(grep $1 $2 --no-messages | xargs)
  IFS="=" read -ra VAR <<< "$VAR"
  echo ${VAR[1]:=$3}
}

echo "📧 Reading environment values from .env, defaulting to values in test.sh"
export DEV_GANACHE_HOST=$(read_var DEV_GANACHE_HOST .env 127.0.0.1)
export DEV_GANACHE_PORT=$(read_var DEV_GANACHE_PORT .env 8546)
export DEV_GANACHE_NETWORK_ID=$(read_var DEV_GANACHE_NETWORK_ID .env 8888888)
export DEV_GANACHE_MNEMONIC=$(
  read_var DEV_GANACHE_MNEMONIC .env \
  "brain surround have swap horror body response double fire dumb bring hazard"
)

if [[ $(command -v lsof) && $(lsof -ti :${DEV_GANACHE_PORT}) ]]
then
  echo "Detected a process (probably an existing ganache instance) listening on ${DEV_GANACHE_PORT}. Exiting."
  exit 1
fi

{
  long_console_info="⛓ Starting ganache-cli at "
  long_console_info+="http://${DEV_GANACHE_HOST}:${DEV_GANACHE_PORT} "
  long_console_info+="(network_id: ${DEV_GANACHE_NETWORK_ID})"
}
echo ${long_console_info}
ganache-cli \
  --defaultBalanceEther 10000 \
  --gasLimit 0xfffffffffff \
  --gasPrice 0x01 \
  --host ${DEV_GANACHE_HOST} \
  --port ${DEV_GANACHE_PORT} \
  --mnemonic "${DEV_GANACHE_MNEMONIC}" `# must be quoted to include spaces` \
  --networkId ${DEV_GANACHE_NETWORK_ID} \
  --quiet \
  &> /dev/null \
  &

PID_FOR_GANACHE_CLI=$!

echo "⚙️ Running migrations with build artifacts from @counterfactual/contracts"
# TODO: For some reason this re-compiles all of the contracts unnecessarily
#       and there isn't a --no-compile option on the command :(
yarn run truffle migrate --network machine --reset > /dev/null

echo "🎬 Starting jest test suites"

jest \
  --testPathPattern=test/machine/integration/ \
  --runInBand `#integration tests fail parallelized (tx nonce out of sync)` \
  --detectOpenHandles \
  --forceExit \
  $1
