[![CircleCI](https://circleci.com/gh/counterfactual/machine/tree/master.svg?style=svg&circle-token=adc9e1576b770585a350141b2a90fc3d68bc048c)](https://circleci.com/gh/counterfactual/machine/tree/master)

## Usage

This repo uses the yarn package manager. To install the dependencies, run:

```shell
yarn
```

## Testing

To build the Docker containers, run:

```shell
yarn docker:build
```

Then to get a persisent machine container that you can reuse across tests, run:

```shell
yarn docker:run
```

Then to deploy the contrats that are used in testing: run

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
