# This script file builds the entire monorepo.
#
# This is necessary because we're using IIFEs and symlinks
# to make the dApps work. This should go away as soon as
# Rollup modules get fixed.

set -e

packages="contracts common-types cf.js machine node node-provider playground-server playground dapp-high-roller"

for package in $packages; do
  echo ">>> Building package: $package"
  cd packages/$package
  yarn build
  cd -
done
