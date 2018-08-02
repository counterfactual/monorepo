# [Counterfactual](https://counterfactual.com)  &middot; <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />  [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/master/LICENSE)  [![CircleCI](https://circleci.com/gh/counterfactual/counterfactual.svg?style=shield&circle-token=755f90dc490099c4e5f4334f16355a6262158bcf)](https://circleci.com/gh/counterfactual/counterfactual)

#### ⚠️️️ This is _highly_ experimental software, do not run in production! ️️⚠️️️

Counterfactual is a general framework for building state channel applications.

- **Generalized**: Counterfactual makes no assumptions about your application, the type of state being passed around, the number of parties in the channel, the type of asset being stored, or the structure of your application. It is fully generalized to support any number of state channel applications for _n_-party channels with zero on-chain transactions for installing or uninstalling applications.

- **Modular**: Write your application logic without concerning yourself with the details of the state channel dispute process, timeout periods, or for edge case attack scenarios. Counterfactual aims to seperate the state channel logistics from your application logistics. Applications themselves, despite being secured through the same on-chain multisignature wallet, are completely isolated from each other.

- **Maximally Off-Chain**: The only on-chain component for a state channel in Counterfactual is a multisignature wallet. Everything else is supported through the technique of counterfactual instantiation (i.e., generating deterministic references to off-chain contract code).

## Contributing

The main purpose of this repository is to continue to evolve Counterfactual's contracts layer, iterating towards improving it for production use. Development of Counterfactual happens in the open on GitHub, and we are grateful to the community for contributing bugfixes and improvements.

## Development

1.  Install node v8.x or v10.x
2.  `yarn`

To run the tests:

3.  Run `yarn ganache` in a separate terminal
4.  `yarn test`

## License

Counterfactual is [MIT licensed](./LICENSE).
