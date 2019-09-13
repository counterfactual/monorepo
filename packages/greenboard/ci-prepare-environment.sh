#!/bin/bash
NODE_ENV="test"
COUNTERFACTUAL_PATH="/home/circleci/project"

# Run the Hub and the Wallet UI.
cd $COUNTERFACTUAL_PATH/
echo "Running the Hub/Wallet stack as a background process..."
yarn run:wallet:e2e &
wait %1
WALLET_E2E_EXIT_CODE=$?
cd $COUNTERFACTUAL_PATH/packages/greenboard
echo "> OK"

echo "============================================================================="

