#!/bin/sh
alias yarn_install_command="yarn --ignore-engines"
alias yarn_ci_command="yarn --frozen-lockfile --ignore-engines"
alias yarn_build_command="yarn --ignore-engines build"
alias yarn_dist_command="yarn --ignore-engines dist"
alias yarn_rm_command="yarn --ignore-engines remove"
alias yarn_add_command="yarn --ignore-engines add -D"

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
  yarn_ci_command &>/dev/null
  yarn_add_command @babel/core &>/dev/null
  yarn_dist_command &>/dev/null
echo "OK"

# Move MM distributable to Greenboard.
echo -n "Cleaning up..."
  mv $WORKING_DIRECTORY/metamask/dist/chrome $COUNTERFACTUAL_PATH/packages/greenboard/extension
  rm -rf $WORKING_DIRECTORY/metamask;
echo "OK"

# Set test runner directory.
cd $COUNTERFACTUAL_PATH/packages/greenboard

# Install dependencies for Greenboard.
echo -n "Installing Greenboard dependencies..."
  yarn_install_command &>/dev/null
  cp -rl node_modules/* ../../node_modules/
  yarn global add serve
echo "OK"

# Run the Hub and the Wallet UI.
cd $COUNTERFACTUAL_PATH/
yarn run:wallet:e2e &
cd $COUNTERFACTUAL_PATH/packages/greenboard

# Run the tests through Xvfb.
echo -n "Waiting for the Hub to spin up..."
  while ! timeout 1 bash -c "nc -N localhost 9001 < /dev/null"; do sleep 0.1; done
echo "OK"

echo -n "Waiting for the Wallet UI to spin up..."
  while ! timeout 1 bash -c "nc -N localhost 3334 < /dev/null"; do sleep 0.1; done
echo "OK"

echo "Running tests now!"
xvfb-run yarn start
