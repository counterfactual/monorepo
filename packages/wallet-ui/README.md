# 💳 Wallet UI

A friendly way to keep track of your assets stored in a Counterfactual account.

The Wallet UI is the first plugin ever built for the [MetaMask](https://github.com/metamask/metamask-extension) extension. We've built a [custom fork](https://github.com/prototypal/metamask-extension) of the extension so MetaMask can understand the state channels' protocol and interact with a Counterfactual [Node](https://github.com/counterfactual/monorepo/tree/master/packages/node).

## How can I use it?

For now, it's only available in our custom fork. Follow [these instructions](https://github.com/counterfactual/monorepo/tree/master/packages/cf-metamask-extension) to build your own copy of MetaMask and use the Wallet UI in that environment.

## How can I work on it?

### Running the Wallet UI
First of all, you will need an [Etherscan api key](https://etherscan.io/myapikey) to be able to retrieve the ERC20's Metamask Wallet balances.
Then you need to add the `REACT_APP_ETHERSCAN_API_KEY` environment variable on the Wallet-UI package's .env file.

On the monorepo's root:

```sh
 yarn run:wallet
```

This command will serve a CRA development server on `http://localhost:3334` and the [Simple Hub Server](https://github.com/counterfactual/monorepo/tree/master/packages/simple-hub-server) on `http://localhost:9000`.

### Testing the Wallet UI

From the package's directory:

```sh
yarn test
yarn test:coverage # Will report coverage percentages for the package.
```

These commands will run unit and integration tests on the package.
