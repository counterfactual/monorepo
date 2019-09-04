# [@counterfactual/cf-adjudicator-contracts](https://github.com/counterfactual/monorepo/tree/master/packages/cf-adjudicator-contracts) <img align="right" src="../../logo.svg" height="80px" />

Counterfactual is a general framework for building state channel applications. An overview of the principles and objectives of this framework can be found at the [Counterfactual specifications repo](https://github.com/counterfactual/specs).

## Development

**Make sure you have Yarn v1.10.1 installed or higher**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

To install the dependencies:

```shell
yarn
```

### Compiling Solidity

To compile the Solidity source code into bytecode and ABI, run:

```shell
yarn build
```

### Tests

To run all tests:

```shell
yarn test
```

To run only specific tests:

```shell
yarn test [test/<filename of specific test>.spec.ts ...]
```

# Migrations

The `networks` folder contains the migration files for the different Ethereum networks the contracts have been migrated to. The ID of the respective networks are used as file names. The mapping of some of the major Ethereum network IDs to network names is:

| Network ID | Network Name    |
| ---------- | --------------- |
| 1          | Main net        |
| 3          | Ropsten testnet |
| 4          | Rinkeby testnet |
| 42         | Kovan testnet   |

Not all of the networks will be used for the Counterfactual contracts, but you can find a more comprehensive list [here](https://ethereum.stackexchange.com/a/17101). To run a migration against a target network:

- make sure the target network configuration exists in `truffle-config.js`
- `cp .env.example .env` and make sure the right env vars are set in `.env`
  - note that the address of the account that needs to be funded to deploy the contracts is derived (in a node.js REPL) via: `require('ethers').Wallet.fromMnemonic('ETH_ACCOUNT_MNENOMIC')`
- the network account you're using to send transactions from is funded (eg. for Rinkeby: https://faucet.rinkeby.io/)
- run: `yarn migrate --network <network name>`
