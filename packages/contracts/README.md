# [Counterfactual](https://counterfactual.com) <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

Counterfactual is a general framework for building state channel applications. An overview of the principles and objectives of this framework can be found at the [Counterfactual specifications repo](https://github.com/counterfactual/specs).

## Development

**Make sure you have Yarn v1.10.1**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

To install the dependencies:

```shell
yarn
```

### Building the package

To build the machine package:

```shell
yarn build
```

### Tests

To ensure correctness of the Solidity contracts, the tests run against `ganache-cli` instance running in the background. To do this, run:

```shell
cd ../../
yarn ganache
cd packages/contracts
```

You also need to migrate the contracts in the contracts package to generate a `networks` file which the tests consume:

```shell
yarn migrate --network ganache
```

Finally, to run all tests:

```shell
yarn test
```

# Migrations

The `networks` folder contains the migration files for the different Ethereum networks the contracts have been migrated to. The ID of the respective networks are used as file names.
The mapping of some of the major Ethereum network IDs to network names is:

| Network ID | Network Name    |
| ---------- | --------------- |
| 1          | Main net        |
| 3          | Ropsten testnet |
| 4          | Rinkeby testnet |
| 42         | Kovan testnet   |

Not all of the networks will be used for the Counterfactual contracts, but you can find a more comprehensive list [here](https://ethereum.stackexchange.com/a/17101).
To run a migration against a target network:

- make sure the target network configuration exists in `truffle.js`
- the right env vars are set in `.env`
- the network account you're using to send transactions from is funded (eg. for Rinkeby: https://faucet.rinkeby.io/)
- run: `yarn migrate --network <network name>`
