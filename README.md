# machine

[![CircleCI](https://circleci.com/gh/counterfactual/machine/tree/master.svg?style=svg&circle-token=adc9e1576b770585a350141b2a90fc3d68bc048c)](https://circleci.com/gh/counterfactual/machine/tree/master)

## Usage

This repo uses the yarn package manager. To install the dependencies, run:

```shell
yarn
git submodule update --init --recursive
```

## Testing

To build the Docker containers, run:

```shell
yarn docker:build
```

Make sure no other ganache instance is running on port 9545, then to get a persisent machine container that you can reuse across tests, run:

```shell
yarn docker:run
```

To deploy the contracts that are used in testing, run:

```shell
yarn test:deployContracts
```

And to run the test suites, simply run:

```shell
yarn test
```

If you want to run a specific test suite (i.e. `.spec.ts` file), you can specify that via a regex that would capture the file name:

```shell
yarn test <regex>
```

for eg:

```shell
yarn test lifecycle.spec.ts
```

If you need to go inside the machine container, run:

```shell
yarn shell
```

## Ethmo

### Rebuilding

- `yarn rollup`

### Running / Development

- install/run the `multi-app-wallet` branch of the venmo app, following the instructions [here](https://github.com/ebryn/venmo/tree/multi-app-wallet#installation)
- `python -m SimpleHTTPServer`
- visit your app at [http://localhost:8000/src/examples/wallet/](http://localhost:8000/src/examples/wallet/)
