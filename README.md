<img src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810" width="200px" height="200px"/>

---

# [Counterfactual](https://counterfactual.com) &middot; [![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/facebook/react/blob/master/LICENSE)

Counterfactual is a general framework for building state channel applications.

This repository is a monorepo containing all the packages that comprise the implementation of the Counterfactual framework.

Each sub-package is an independent npm package.

## Building and Testing

Make sure you have Yarn v1.10.1+.

To install the dependencies, run:

```shell
yarn
lerna bootstrap --hoist
```

The build environment expects a ganache instance to be running in the background so run:

```shell
yarn ganache
```

To build, run:

```shell
yarn build
```

This builds the packages in the order of specified dependencies.

_Note_: Because the monorepo uses workspaces and `wsrun`, running the build/test script on a specific package will run that script for all the packages in the monorepo that are dependencies of that package. If you want to run the script for that specific package, `cd` into its directory and run the script in there.

To build a specific package, run:

```shell
PKG=<package-name> yarn build
```

For example,

```shell
PKG=@counterfactual/contracts yarn build
```

To test the packages, run:

```shell
yarn test
```

To test a specific package, run:

```shell
PKG=<package-name> yarn test
```
