# [Playground Demo](https://github.com/counterfactual/monorepo/tree/master/packages/playground) <img align="right" src="../../logo.svg" height="80px" />

This is an environment to run dApps (state channel-based decentralized applications) using [CF.js](../cf.js). It allows to showcase different demo apps, presenting a variety of use cases where state channels are applicable.

## Usage

For the moment, this package is available as a local app _(hosted version coming soon!)_.

**Make sure you have Yarn v1.10.1 installed or higher**. Refer to [Yarn's installation guide](https://yarnpkg.com/lang/en/docs/install/) for setup instructions for your operating system.

To install the dependencies:

```shell
yarn
```

To run the Playground:

```shell
yarn start
```

This will build the application and open a `stencil` dev server instance in your preferred browser, while watching the source files for any changes.

If using Firefox or any browsers without full support to Custom Elements, you can run the project with ES5 transpiling enabled (it'll slow down the live rebuilding a bit but it'll work):

```shell
yarn start --es5
```

### Execution requeriments

Ideally, you'd run in parallel at least three packages in order to fully use the Playground:

- The Playground itself (this package)
- The [Playground Server](../playground-server)
- At least one dApp (i.e. [High Roller](../dapp-high-roller))

You can use the following command at the monorepo's root to run all three projects:

```shell
yarn run:playground
```
