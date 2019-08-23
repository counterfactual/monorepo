#!/bin/sh

alias yarn_install_command="yarn --ignore-engines"
alias yarn_ci_command="yarn --frozen-lockfile --ignore-engines"
alias yarn_build_command="yarn --ignore-engines build"
alias yarn_dist_command="yarn --ignore-engines dist"
alias yarn_rm_command="yarn --ignore-engines remove"
alias yarn_add_command="yarn --ignore-engines add -D"

# Clone MetaMask.
git clone --depth 1 --single-branch --branch $METAMASK_BRANCH https://github.com/${METAMASK_REPOSITORY} $WORKING_DIRECTORY/metamask

# Inject CF IIFE dependencies into MetaMask.
cp $COUNTERFACTUAL_PATH/packages/cf.js/dist/index-iife.js $WORKING_DIRECTORY/metamask/app/vendor/counterfactual/node/cf.js.iife.js
cp $COUNTERFACTUAL_PATH/packages/node/dist/index.iife.js $WORKING_DIRECTORY/metamask/app/vendor/counterfactual/node/node.iife.js
cp $COUNTERFACTUAL_PATH/packages/firebase-client/dist/index.iife.js $WORKING_DIRECTORY/metamask/app/vendor/counterfactual/node/firebase-client.iife.js

cd $WORKING_DIRECTORY/metamask

# Build MetaMask without some heavy binaries. Mostly done because @sentry/cli
# isn't compatible with Alpine Linux, and we don't need it in this case.
# We also manually add @babel/core because on a subdependency level, it was
# getting installed and it's necessary for transpilation.
mv package.json package.json.original
sed -r '/\@sentry\/cli|\@storybook|eslint|chromedriver|geckodriver|selenium-webdriver|jsdom|"karma|"mocha|tape|testem|qunitjs|gh-pages|"ganache-cli/d' package.json.original > package.json
yarn_ci_command
yarn_add_command @babel/core
yarn_dist_command

# Move MM distributable to Greenboard.
mv $WORKING_DIRECTORY/metamask/dist/chrome $COUNTERFACTUAL_PATH/packages/greenboard/extension
rm -rf $WORKING_DIRECTORY/metamask;

# Set test runner directory.
cd $COUNTERFACTUAL_PATH/packages/greenboard

# Install dependencies for Greenboard.
yarn_install_command
mv node_modules/* ../../node_modules/

# Run the tests through Xvfb.
xvfb-run yarn start
