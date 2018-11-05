# [IFrame Wallet Proof of Concept (PoC)](https://counterfactual.com) <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

The IFrame wallet package is a typescript implementation of the software wrapping the @counterfactual/machine code to provide capabilities discussed in the [machine's README](https://github.com/counterfactual/monorepo/tree/master/packages/machine#machine--). More specifically, some of these capabilities include:

- providing an `IOProvider` to facilitate machine-to-machine communication
- providing a signing service
- providing a commitment store

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

Presently for some of the tests to work, you need to have a `ganache-cli` instance running in the background. To do this, run using:

```shell
cd ../../
yarn ganache
cd packages/iframe-wallet-poc
```

You also need to migrate the contracts in the contracts package to generate a `networks` file which the `machine` package directly consumes (for now).

```shell
cd ../contracts
yarn migrate
cd ../iframe-wallet-poc
```

Finally, to run all tests:

```shell
yarn test
```

### Serving the Wallet

As the wallet is wrapped in an IFrame, we need to serve the IFrame. To do this, run:

```shell
cd ../../
# if using Python 3.x
python -m http.server
# if using Python 2.x
python -m SimpleHTTPServer
```

Then visit: http://localhost:8000/packages/iframe-wallet-poc/iframe-wallet/

**Note: The current version has been developed alongside the [Ethmo application](https://github.com/counterfactual/ethmo). Once your server has started, follow the README on the Ethmo repository to play around with an application using this wallet.**

When you've served Ethmo as well, you should see something similar to this:
<img width="1561" alt="screen shot 2018-10-29 at 7 47 27 am" src="https://user-images.githubusercontent.com/38441757/47633688-21c10f80-db4f-11e8-98ef-e28f98198150.png">
