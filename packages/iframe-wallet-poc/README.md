## Development

**Make sure you have Yarn v1.10.1**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

1. Run `yarn` and `yarn bootstrap` from the root of the repo.
2. In this directory, run the following:

- `yarn build`
- `yarn rollup`

## Linking to contracts

The wallet is the entrypoint for the contracts being used in the Counterfactual stack. To make sure the latest contracts are being used, follow the README in the contract package, then do a `yarn rollup` on the wallet to include the latest built contracts in its context.
