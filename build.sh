#!/usr/bin/bash
packages="contracts common-types cf.js machine node node-provider playground dapp-high-roller"

for package in $packages; do
  echo ">>> Building package: $package"
  cd packages/$package
  yarn build
  cd ../..
done
