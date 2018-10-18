## Development

1. Run `yarn` and `yarn bootstrap` from the root of the repo.
2. In this directory, run the following:

- `yarn build`
- `yarn rollup`

## Linking to contracts

The wallet is the entrypoint for the contracts being used in the Counterfactual stack. To make sure the latest contracts are being used, follow the README in the contract package, then do a `yarn rollup` on the wallet to include the latest built contracts in its context.
