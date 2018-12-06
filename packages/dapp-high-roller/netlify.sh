packages="contracts common-types cf.js node-provider dapp-high-roller"

cd ../..

for package in $packages; do
  echo ">>> Building package: $package"
  cd packages/$package
  yarn build
  cd ../..
done
