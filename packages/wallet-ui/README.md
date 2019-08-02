# 💳 Wallet UI

A friendly way to keep track of your assets stored in a Counterfactual account.

The Wallet UI is the first plugin ever built for the [Metamask](https://github.com/metamask/metamask-extension) extension. We've built a [custom fork](https://github.com/prototypal/metamask-extension) of the extension so Metamask can understand the state channels' protocol and interact with a Counterfactual [Node](https://github.com/counterfactual/monorepo/tree/master/package/node).

## How can I use it?

For now, it's only available in our custom fork. Follow [these instructions](https://github.com/counterfactual/monorepo/tree/master/cf-metamask-extension) to build your own copy and use the Wallet UI in that environment.

## How can I work on it?

### Running the Wallet UI

```sh
yarn start
```

This command will serve a CRA development server in `http://localhost:3334`.

### Testing the Wallet UI

```sh
yarn test
yarn test:coverage # Will report coverage percentages for the package.
```

These commands will run unit tests on the package.
