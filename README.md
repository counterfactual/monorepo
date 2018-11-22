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
  <a href="https://counterfactual.com/chat"><img src="https://img.shields.io/discord/500370633901735947.svg"/></a>
  <a href="https://greenkeeper.io/"><img src="https://badges.greenkeeper.io/counterfactual/monorepo.svg?token=62c4bef4c3c26412e67360cc4a193492b9561901a499761d65b76a22b65efb16&ts=1540411566259"/></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
</p>
<br>

**Counterfactual** is a simple off-chain framework for building **state channel applications** on top of the Ethereum blockchain. It aims to make it simpler to build permissionless applications that have instant finality with zero-fee transactions.

You can learn more about what state channels are by reading [our whitepaper](https://counterfactual.com/statechannels) or a less technical written [description](https://medium.com/l4-media/making-sense-of-ethereums-layer-2-scaling-solutions-state-channels-plasma-and-truebit-22cb40dcc2f4#c353). Further, if you want to dive into the specifications of the Counterfactual protocol you can [read them here](https://counterfactual.com/specs).

## Contributing

- **Join us in [Discord][counterfactual-discord-url]** to help
  with development or to hang out with some ethereum hackers :)
- **[Create a new issue](https://github.com/counterfactual/monorepo/issues/new)** to report bugs
- **[Fix an issue](https://github.com/counterfactual/counterfactual/issues?state=open)**. Counterfactual
  is an [Open Source Project](.github/CONTRIBUTING.md)!

### Installing dependencies

**Make sure you have Yarn v1.10.1**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

To install the dependencies:

```shell
yarn
```

### Building packages

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

Presently for some of the tests to work, you need to have a `ganache-cli` instance running in the background. To do this, run using:

```shell
yarn ganache
```

You also need to migrate the contracts in the contracts package to generate a `networks` file which the `machine` package directly consume (for now).

```shell
cd packages/contracts
yarn migrate --network ganache
```

Finally, to run all tests:

```shell
yarn test
```

[counterfactual-discord-url]: https://counterfactual.com/chat
