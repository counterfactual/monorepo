#!/bin/sh
YARN_OP_FLAGS="--ignore-engines"
YARN_BUILD_FLAGS="$YARN_OP_FLAGS --unsafe-perm --build-from-source"
alias yarn_install_command="yarn $YARN_BUILD_FLAGS"
alias yarn_ci_command="yarn $YARN_OP_FLAGS --frozen-lockfile"
alias yarn_build_command="yarn $YARN_OP_FLAGS build"
alias yarn_dist_command="yarn $YARN_OP_FLAGS dist"
alias yarn_rm_command="yarn $YARN_OP_FLAGS remove"
alias yarn_add_command="yarn $YARN_BUILD_FLAGS add -D"
alias yann_add_global_command="yarn global add $YARN_BUILD_FLAGS"

# Enable core dumps.
ulimit -c unlimited

# Clone MetaMask.
echo -n "Cloning MetaMask..."
  git clone --depth 1 --single-branch --branch $METAMASK_BRANCH https://github.com/${METAMASK_REPOSITORY} $WORKING_DIRECTORY/metamask &>/dev/null
echo "OK"

echo -n "Injecting CF into MetaMask..."
  # Inject CF IIFE dependencies into MetaMask.
  cp $COUNTERFACTUAL_PATH/packages/cf.js/dist/index-iife.js $WORKING_DIRECTORY/metamask/app/vendor/counterfactual/node/cf.js.iife.js
  cp $COUNTERFACTUAL_PATH/packages/node/dist/index.iife.js $WORKING_DIRECTORY/metamask/app/vendor/counterfactual/node/node.iife.js
  cp $COUNTERFACTUAL_PATH/packages/firebase-client/dist/index.iife.js $WORKING_DIRECTORY/metamask/app/vendor/counterfactual/node/firebase-client.iife.js
echo "OK"

cd $WORKING_DIRECTORY/metamask

# Build MetaMask without some heavy binaries. Mostly done because @sentry/cli
# isn't compatible with Alpine Linux, and we don't need it in this case.
# We also manually add @babel/core because on a subdependency level, it was
# getting installed and it's necessary for transpilation.
echo -n "Removing non-essential dependencies..."
  mv package.json package.json.original
  sed -r '/\@sentry\/cli|\@storybook|eslint|chromedriver|geckodriver|selenium-webdriver|jsdom|"karma|"mocha|tape|testem|qunitjs|gh-pages|"ganache-cli/d' package.json.original > package.json
echo "OK"

echo -n "Building MetaMask..."
  yarn_ci_command #&>/dev/null
  yarn_add_command @babel/core #&>/dev/null
  yarn_dist_command #&>/dev/null
echo "OK"

# Move MM distributable to Greenboard.
echo -n "Cleaning up..."
  mv $WORKING_DIRECTORY/metamask/dist/chrome $COUNTERFACTUAL_PATH/packages/greenboard/extension
  rm -rf $WORKING_DIRECTORY/metamask;
echo "OK"

# Install dependencies for Greenboard.
echo -n "Installing Greenboard dependencies..."
  cd $COUNTERFACTUAL_PATH/packages/greenboard
  yarn_install_command #&>/dev/null
  cp -rl node_modules/* ../../node_modules/
  yann_add_global_command serve #&>/dev/null
echo "OK"

# Install dependencies for the Hub.
echo -n "Installing Hub dependencies..."
  cd $COUNTERFACTUAL_PATH/packages/simple-hub-server
  yarn_install_command &>/dev/null
  cp -rl node_modules/* ../../node_modules/
echo "OK"

# Initialize logs.
echo -n "Initializing logs..."
  mkdir -p $COUNTERFACTUAL_PATH/packages/greenboard/chrome-profile
  touch /tmp/hub-wallet.log
  touch $COUNTERFACTUAL_PATH/packages/greenboard/chrome-profile/chrome_debug.log
  touch $COUNTERFACTUAL_PATH/packages/greenboard/chrome-profile/greenboard-local-storage.json
echo "OK"

# Run the Hub and the Wallet UI.
cd $COUNTERFACTUAL_PATH/
yarn run:wallet:e2e & wait %1; WALLET_E2E_EXIT_CODE=$?
cd $COUNTERFACTUAL_PATH/packages/greenboard

# Run the tests through Xvfb.
echo -n "Waiting for the Hub to spin up..."
  while ! sh -c "nc -n localhost 9001 < /dev/null";
  do
    if [ "$WALLET_E2E_EXIT_CODE" -ne 0 ];
    then
      break
    fi

    sleep 0.1;
  done
echo "OK"

echo -n "Waiting for the Wallet UI to spin up..."
  while ! sh -c "nc -n localhost 3334 < /dev/null";
  do
    if [ "$WALLET_E2E_EXIT_CODE" -ne 0 ];
    then
      break
    fi

    sleep 0.1;
  done
echo "OK"

if [ "$WALLET_E2E_EXIT_CODE" -ne 0 ]; then
  echo "Cannot run tests, Hub/Wallet UI initialization failed"
else
  echo "Running tests now!"
  xvfb-run yarn start
fi

echo "Hub & Wallet UI logs ==========================================="
cat /tmp/hub-wallet.log

echo "ChromeDriver logs =============================================="
cat ./chrome-profile/chrome_debug.log

echo "Node storage dump =============================================="
cat ./chrome-profile/greenboard-local-storage.json

exit $WALLET_E2E_EXIT_CODE
