# [High Roller](https://github.com/counterfactual/monorepo/tree/master/packages/dapp-high-roller) <img align="right" src="../../logo.svg" height="80px" />

This is a demo dApp (state channel-based decentralized applications) using [CF.js](../cf.js) that runs inside of the [Playground](../playground).

This specific demo dApp is **High Roller**. The game pairs two players that compete to get the highest dice roll using two dice each. Before each game the players bet on the fact that they will win using Ether. The winner receives the bet amount from both players. This dApp showcases using state channels in a situation where multiple transfers between two parties must be made in a short amount of time.

## Usage

For the moment, this package is available as a local app _(hosted version coming soon!)_.

**Make sure you have Yarn v1.10.1 installed or higher**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

To install the dependencies:

```shell
yarn
```

To run the High Roller dApp:

```shell
yarn start
```

This will build the application and open a `stencil` dev server instance in your preferred browser, while watching the source files for any changes.

If using Firefox or any browsers without full support to Custom Elements, you can run the project with ES5 transpiling enabled (it'll slow down the live rebuilding a bit but it'll work):

```shell
yarn start --es5
```
