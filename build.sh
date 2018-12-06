#!/usr/bin
packages="contracts common-types machine cf.js node node-provider playground dapp-high-roller"

set -e

for package in $packages; do
  echo ">>> Building package: $package"
  cd packages/$package
  yarn build
  cd -
done
