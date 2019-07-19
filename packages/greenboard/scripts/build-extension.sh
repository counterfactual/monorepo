#!/bin/bash

# This scripts packs an updated version of the Metamask Extension with
# the necessary updates to the CF vendor assets.

# Note: Working directory is NOT ./scripts; is the root of the package.

function parse_json()
{
  echo $1 | \
  sed -e 's/[{}]/''/g' | \
  sed -e 's/", "/'\",\"'/g' | \
  sed -e 's/" ,"/'\",\"'/g' | \
  sed -e 's/" , "/'\",\"'/g' | \
  sed -e 's/","/'\"---SEPARATOR---\"'/g' | \
  awk -F=':' -v RS='---SEPARATOR---' "\$1~/\"$2\"/ {print}" | \
  sed -e "s/\"$2\"://" | \
  tr -d "\n\t" | \
  sed -e 's/\\"/"/g' | \
  sed -e 's/\\\\/\\/g' | \
  sed -e 's/^[ \t]*//g' | \
  sed -e 's/^"//'  -e 's/"$//'
}

PWD="$(pwd)"
SOURCE_REPO=prototypal/metamask-extension
SOURCE_BRANCH=joel/for-wallet-ui

export PYTHON=/usr/bin/python2.7

echo "Cloning Metamask..."
rm -rf /tmp/metamask-extension
git clone --depth 1 --single-branch --branch $SOURCE_BRANCH git@github.com:$SOURCE_REPO /tmp/metamask-extension

echo "Building CF dependencies"
cd ../../
yarn && yarn build

echo "Injecting CF IIFEs..."
cp $PWD/packages/cf.js/dist/index-iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/cf.js.iife.js
cp $PWD/packages/firebase-client/dist/index.iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/firebase-client.iife.js
cp $PWD/packages/node/dist/index.iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/node.iife.js

echo "Installing Metamask dependencies and rebuilding extension..."
cd /tmp/metamask-extension
nvm use
npm install
gulp dist

echo "Reading Metamask version..."
METAMASK_VERSION=$(parse_json "$(cat /tmp/metamask-extension/app/manifest.json)" version)

echo "Copying extension to Greenboard root..."
cd $PWD
nvm use
rm -rf ../extension && mkdir ../extension
cp /tmp/metamask-extension/builds/metamask-chrome-$METAMASK_VERSION.zip $PWD/../extension/metamask.zip

echo "Done!"
