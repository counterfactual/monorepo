# This script file builds the minimum set of local dependencies
# to deploy the High Roller dApp.
# This is necessary because we're using IIFEs and symlinks
# to make the dApp work. This should go away as soon as
# Rollup modules get fixed.
# Also, we're forcing reinstallation of yarn@1.10.1 due to a
# Netlify bug with Lerna monorepos:
# https://github.com/netlify/build-image/issues/196

npm i -g yarn@1.10.1

packages="contracts types cf.js node-provider dapp-high-roller"

cd ../..

for package in $packages; do
  echo ">>> Building package: $package"
  cd packages/$package
  yarn build
  cd ../..
done
