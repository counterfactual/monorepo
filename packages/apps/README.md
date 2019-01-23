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
