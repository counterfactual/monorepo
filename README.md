**NOTE**: This repository has been moved. Work is continuing under the [@statechannels](https://github.com/statechannels) organization as part of [statechannels.org](http://statechannels.org) project to unify state channels initiatives.

<h1 align="center">
  <br>
  <a href="https://counterfactual.com"><img src="./logo.svg" alt="Counterfactual" width="150"></a>
  <br>
  Counterfactual
  <br>
  <br>
</h1>

<h4 align="center">Simple off-chain applications framework for Ethereum.</h4>

<p align="center">
  <a href="https://circleci.com/gh/counterfactual/monorepo"><img src="https://circleci.com/gh/counterfactual/monorepo.svg?style=shield&circle-token=adc9e1576b770585a350141b2a90fc3d68bc048c" alt="circleci"></a>
  <a href="https://lernajs.io/"><img src="https://img.shields.io/badge/maintained%20with-lerna-cc00ff.svg"/></a>
  <a href="https://counterfactual.com/chat"><img src="https://img.shields.io/discord/500370633901735947.svg"/></a>
  <a href="https://github.com/renovatebot/renovate"><img src="https://badges.renovateapi.com/github/counterfactual/monorepo"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
</p>
<br>

**Counterfactual** is a simple off-chain framework for building **state channel applications** on top of the Ethereum blockchain. It aims to make it simpler to build permissionless applications that have instant finality with zero-fee transactions.

You can learn more about what state channels are by reading [our whitepaper](https://counterfactual.com/statechannels) or a less technical written [description](https://medium.com/l4-media/making-sense-of-ethereums-layer-2-scaling-solutions-state-channels-plasma-and-truebit-22cb40dcc2f4#c353). Further, if you want to dive into the specifications of the Counterfactual protocol you can [read them here](https://counterfactual.com/specs).

- [Packages](#packages)
  - [Solidity Packages](#solidity-packages)
  - [Typescript/Javascript Packages](#typescriptjavascript-packages)
- [Contributing](#contributing)
  - [Ethereum Networks](#ethereum-networks)
  - [Installing dependencies](#installing-dependencies)
  - [Building packages](#building-packages)
  - [Clean](#clean)
  - [Lint](#lint)
  - [Tests](#tests)
  - [Patches](#patches)

## Packages

### Solidity Packages

| Package | Version | Description |
| --- | --- | --- |
| [`@counterfactual/cf-funding-protocol-contracts`](/packages/cf-funding-protocol-contracts) | [![npm](https://img.shields.io/npm/v/@counterfactual/cf-funding-protocol-contracts.svg)](https://www.npmjs.com/package/@counterfactual/cf-funding-protocol-contracts) | Contracts implementation of the Counterfactual funding protocol |
| [`@counterfactual/cf-adjudicator-contracts`](/packages/cf-adjudicator-contracts) | [![npm](https://img.shields.io/npm/v/@counterfactual/cf-adjudicator-contracts.svg)](https://www.npmjs.com/package/@counterfactual/cf-adjudicator-contracts) | Contracts implementation of an AppInstance Adjudicator |

### Typescript/Javascript Packages

**Counterfactual-specific packages**

| Package | Version | Description |
| --- | --- | --- |
| [`@counterfactual/node`](/packages/node) | [![npm](https://img.shields.io/npm/v/@counterfactual/node.svg)](https://www.npmjs.com/package/@counterfactual/node) | The core state channels client that a user runs |
| [`@counterfactual/cf.js`](/packages/cf.js) | [![npm](https://img.shields.io/npm/v/@counterfactual/cf.js.svg)](https://www.npmjs.com/package/@counterfactual/cf.js) | A JS API for interacting with off-chain apps |
| [`@counterfactual/node-provider`](/packages/node-provider) | [![npm](https://img.shields.io/npm/v/@counterfactual/node-provider.svg)](https://www.npmjs.com/package/@counterfactual/node-provider) | Wrapper around API calls to a Node |

**Utilities**

| Package | Version | Description |
| --- | --- | --- |
| [`@counterfactual/types`](/packages/types) | [![npm](https://img.shields.io/npm/v/@counterfactual/types.svg)](https://www.npmjs.com/package/@counterfactual/types) | Shared type declarations |
| [`@counterfactual/typescript-typings`](/packages/typescript-typings) | [![npm](https://img.shields.io/npm/v/@counterfactual/typescript-typings.svg)](https://www.npmjs.com/package/@counterfactual/typescript-typings) | Shims for external library typings |

## Contributing

- **Join us in [Discord][counterfactual-discord-url]** to help with development or to hang out with some ethereum hackers :)
- **[Create a new issue](https://github.com/counterfactual/monorepo/issues/new)** to report bugs
- **[Fix an issue](https://github.com/counterfactual/counterfactual/issues?state=open)**. Counterfactual is an [Open Source Project](.github/CONTRIBUTING.md)!

### Ethereum Networks

The Playground currently only supports the Kovan network.

### Installing dependencies

**Make sure you have Yarn v1.19.0 installed**. For easy management of specific Yarn versions, we recommend using [Yarn Version Manager (YVM)](https://github.com/tophat/yvm).

To install the dependencies:

```shell
yarn
```

### Building packages

It is recommended (optional) that you installed `solc` compiler binary on your machine ([installation guide](https://solidity.readthedocs.io/en/latest/installing-solidity.html#binary-packages)) and specify the following in your `.env` under `cf-funding-protocol-contracts` and `apps`

```shell
NATIVE_SOLC=true
```

To build all packages:

```shell
yarn build
```

### Clean

To clean all packages:

```shell
yarn clean
```

### Lint

To lint all packages:

```shell
yarn lint
```

To also apply automatic fixes:

```shell
yarn lint:fix
```

### Tests

To run all tests:

```shell
yarn test
```

To run E2E tests:

- If you're using E2E tests for the first time or have done recent changes to the code, run:

```shell
yarn test:e2e:setup
```

- If you're re-running tests or writing new scenarios, run:

```shell
NODE_EXTENDED_PRIVATE_KEY="..." yarn test:e2e
```

See the ["Funding the Hub Account for Playground Testing"](./packages/simple-hub-server/README.md) section on the Simple Hub Server package for more information about `NODE_EXTENDED_PRIVATE_KEY`.

### Patches

We generate patches using the [`patch-package`](https://github.com/ds300/patch-package) tool with a workaround described in [this issue](https://github.com/ds300/patch-package/issues/42#issuecomment-435992316) for `yarn` workspaces.

[counterfactual-discord-url]: https://counterfactual.com/chat
