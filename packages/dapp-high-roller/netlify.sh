echo "Yarn version"
yarn -v

cd ../..
cd packages/contracts
yarn build
cd ../..
cd packages/common-types
yarn build
cd ../..
cd packages/cf.js
yarn build
cd ../..
cd packages/node-provider
yarn build
cd ../..
cd packages/dapp-high-roller
yarn build
