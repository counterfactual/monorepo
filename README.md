<img src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810" width="200px" height="200px"/>

---

# [Counterfactual](https://counterfactual.com) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/master/LICENSE)[![CircleCI](https://circleci.com/gh/counterfactual/monorepo.svg?style=svg&circle-token=adc9e1576b770585a350141b2a90fc3d68bc048c)](https://circleci.com/gh/counterfactual/monorepo)

Counterfactual is a general framework for building state channel applications.

This repository is a monorepo containing all the packages that comprise the implementation of the Counterfactual framework.

Each sub-package is an independent npm package.

## Building and Testing

Make sure you have Yarn v1.10.1+.

To install the dependencies, run:

```shell
yarn
lerna bootstrap
```

To build all the packages, make sure port 9545 is free and run:

```shell
yarn build
```

This builds the packages in the order of specified dependencies.

Note: The build script also spins up a ganache instance in the background on port 9545.

---

To build a specific package, _as well as build its Counterfactual package dependencies_, run:

```shell
PKG=<package-name> yarn build
```

For example,

```shell
PKG=@counterfactual/contracts yarn build
```

Otherwise, `cd` into the package directory and run the script directly there.

---

`yarn build` creates distributions for each package. If you want to create a distribution for a specific package, run:

```shell
PKG=<package-name> yarn rollup
```

---

To test the packages, run:

```shell
yarn test
```

To test a specific package, run:

```shell
PKG=<package-name> yarn test
```
