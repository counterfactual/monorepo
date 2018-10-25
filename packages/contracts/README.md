# [Counterfactual](https://counterfactual.com) &middot; <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" /> [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/master/LICENSE) [![CircleCI](https://circleci.com/gh/counterfactual/contracts.svg?style=shield&circle-token=755f90dc490099c4e5f4334f16355a6262158bcf)](https://circleci.com/gh/counterfactual/contracts)

#### ⚠️️️ This is _highly_ experimental software, do not run in production! ️️⚠️️️

Counterfactual is a general framework for building state channel applications.

- **Generalized**: Counterfactual makes no assumptions about your application, the type of state being passed around, the number of parties in the channel, the type of asset being stored, or the structure of your application. It is fully generalized to support any number of state channel applications for _n_-party channels with zero on-chain transactions for installing or uninstalling applications.

- **Modular**: Write your application logic without concerning yourself with the details of the state channel dispute process, timeout periods, or for edge case attack scenarios. Counterfactual aims to seperate the state channel logistics from your application logistics. Applications themselves, despite being secured through the same on-chain multisignature wallet, are completely isolated from each other.

- **Maximally Off-Chain**: The only on-chain component for a state channel in Counterfactual is a multisignature wallet. Everything else is supported through the technique of counterfactual instantiation (i.e., generating deterministic references to off-chain contract code).

## Architecture Overview

Counterfactual provides a small and clean API for application developers to program against. It is designed to allow a clean separation of application-specific code written by an app developer and framework written by us. Application-specific code is isolated in a stateless contract. Examples of these contracts can be seen in the repository `cf-apps`.

When disputes occur, an instance of the contract [`StateChannel.sol`](./contracts/StateChannel.sol) is placed on chain together with a small amount of state. This contract also manages the dispute flow. Upon resolution of a dispute, apps return a struct called `Transfer.Transaction` to determine who gets the value-at-stake, and for common types of value-at-stake, the framework enforces a maximum amount of value transferable.

State deposit is stored in a [multisig wallet](./contracts/MinimumViableMultisig.sol). Apps are installed by signing [commitments](./contracts/delegateTargets/ConditionalTransaction.sol) from the multisig. Deterministic addressing for counterfactually instantiated objects is provided through a [registry](./contracts/Registry.sol).

For a more detailed description of contract architecture, please see [the specs repository](https://github.com/counterfactual/specs/tree/master/contracts).

### Security

If you find a security issue, please contact us at security@counterfactual.com.

## Contributing

The main purpose of this repository is to continue to evolve Counterfactual's contracts layer, iterating towards improving it for production use. Development of Counterfactual happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements.

## Development

**Make sure you have Yarn v1.10.1**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

1. Install node v10.12.0
2. `yarn`

To run the tests:

3. Make sure ganache is running by running `yarn ganache` in the root of the repo, in a separate terminal.
4. `yarn build`
5. `yarn test`

## License

Counterfactual is [MIT licensed](./LICENSE).
