#!/bin/bash
NODE_ENV="test"
COUNTERFACTUAL_PATH="/home/circleci/project"

# Run the tests through Xvfb.
echo -n "Waiting for the Hub to spin up..."
  while ! bash -c "echo > /dev/tcp/localhost/9001";
  do
    if [ $WALLET_E2E_EXIT_CODE -ne 0 ];
    then
      break
    fi

    sleep 0.1;
  done
echo "OK"

echo "============================================================================="

echo -n "Waiting for the Wallet UI to spin up..."
  while ! bash -c "echo > /dev/tcp/localhost/3334";
  do
    if [ $WALLET_E2E_EXIT_CODE -ne 0 ];
    then
      break
    fi

    sleep 0.1;
  done
echo "OK"

echo "============================================================================="

if [ "$WALLET_E2E_EXIT_CODE" -ne 0 ]; then
  echo "Cannot run tests, Hub/Wallet UI initialization failed"
  mkdir -p /tmp/core_dumps
  cp /home/circleci/project/packages/simple-hub-server/core* /tmp/core_dumps
else
  echo "Running tests now!"
  xvfb-run yarn start
fi

echo "============================================================================="

echo "Hub & Wallet UI logs ==========================================="
cat /tmp/hub-wallet.log

echo "ChromeDriver logs =============================================="
cat ./chrome-profile/chrome_debug.log

echo "Node storage dump =============================================="
cat ./chrome-profile/greenboard-local-storage.json

echo "File lists ====================================================="
echo "Node"
ls -alF $COUNTERFACTUAL_PATH/packages/node/*
echo "Greenboard"
ls -alF $COUNTERFACTUAL_PATH/packages/greenboard/*
echo "Simple Hub Server"
ls -alF $COUNTERFACTUAL_PATH/packages/simple-hub-server/*

exit $WALLET_E2E_EXIT_CODE
