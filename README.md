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
  <a href="./LICENSE.md"><img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="license"></a>
  <a href="https://solidity.readthedocs.io/en/develop/index.html"><img src="https://img.shields.io/badge/SOLIDITY-0.4.25-orange.svg" /></a>
</p>
<br>

**Counterfactual** is a simple off-chain framework for building **state channel applications** on top of the Ethereum blockchain. It aims to make it simpler to build permisionless applications that have instant finality with zero-fee transactions.

You can learn more about what state channels are by reading [our whitepaper](https://counterfactual.com/statechannels) or a less technical written [description](https://medium.com/l4-media/making-sense-of-ethereums-layer-2-scaling-solutions-state-channels-plasma-and-truebit-22cb40dcc2f4#c353).

### Ways to help

- **Join us in [Discord][counterfactual-discord-url]** to help
  with development or to hang out with some ethereum hackers :)
- **[Create a new issue](https://github.com/counterfactual/monorepo/issues/new)** to report bugs
- **[Fix an issue](https://github.com/counterfactual/counterfactual/issues?state=open)**. Counterfactual
  is an [Open Source Project](CONTRIBUTING.md)!

## Building and Testing

**Make sure you have Yarn v1.10.1+**, since if you want to change any dependencies, versions <1.10 do not have integrity checks placed in the `yarn.lock`.

To install the dependencies and build the packages, run:

```shell
yarn
yarn build
```

`yarn build` also creates distributions for each package.

To build a specific package, go into its directory and do `yarn build`.

---

## Testing

For some integration tests, a ganache instance is expected to be running in the background. Run:

```shell
yarn ganache
```

which will spin up Ganache in the background.

### Migrating the contracts

The packages' tests depend on some contracts being migrated. To do this, run:

```shell
cd packages/contracts
yarn migrate
```

To test all of the packages, from the root run:

```shell
yarn test
```

To test a specific package, go into its directory and run `yarn test`.

[counterfactual-discord-url]: https://discord.gg/VcTn7fh
