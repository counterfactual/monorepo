#!/bin/bash

MONOREPO_PATH="$(pwd)"

echo "(1/7) Running preflight checks and cleanups..."

if [ -z "$PYTHON" ];
then
  echo "  > Python env-var not found, attempting detection via which"
  PYTHON="$(which python2.7)"
fi

if [ -z "$PYTHON" ];
then
  echo "  > ERROR: You need to install python2.7 to compile node-gyp related dependencies."
  exit
else
  echo "  > Found Python at: $PYTHON"
fi

if [ -d "packages/greenboard/extension" ];
then
  unlink packages/greenboard/extension
  echo "  > Unlinked extension symlink"
fi

if [ -d "/tmp/metamask-extension" ];
then
  rm -rf /tmp/metamask-extension
  echo "  > Cleaned up /tmp/metamask-extension"
fi

echo "(2/7) Cloning metamask into /tmp/metamask-extension..."

git clone --depth 1 --single-branch --branch develop git@github.com:prototypal/metamask-extension /tmp/metamask-extension

echo "(3/7) Ensuring installed dependencies..."

yarn --frozen-lockfile

echo "(4/7) Building Counterfactual..."

yarn build

echo "(5/7) Injecting Counterfactual IIFEs into Metamask vendors..."

cp packages/cf.js/dist/index-iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/cf.js.iife.js
cp packages/firebase-client/dist/index.iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/firebase-client.iife.js
cp packages/node/dist/index.iife.js /tmp/metamask-extension/app/vendor/counterfactual/node/node.iife.js

echo "(6/7) Installing Metamask dependencies and building extension..."

pushd /tmp/metamask-extension
  # Metamask and Counterfactual use very close Node/Yarn versions.
  # Since integrating NVM into this bash script adds more trouble than anything else,
  # we use --ignore-engines to build the extension. Works enough for this context.
  yarn --ignore-engines --frozen-lockfile
  yarn --ignore-engines dist
popd

echo "(7/7) Symlinking Metamask build into Greenboard workspace..."

ln -s /tmp/metamask-extension/dist/chrome $MONOREPO_PATH/packages/greenboard/extension

echo "Ready!"
