# [Machine](https://counterfactual.com) <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

This is the typescript implementation of the [Counterfactual protocol](https://github.com/counterfactual/specs/blob/master/v0/protocols.md). It's responsible for executing these protocols, _producing state commitments_, and thereby effectively facilitating user interaction for off-chain channelized applications.

The specific design philosophy it adopts is the middleware pattern. That is, all of these protocols are naturally broken down into steps, for each of which there is a middleware responsible for executing that step.

Given this design, it's easy to extend the machine to support additional protocols, replace a default middleware with an alternative implementation, and for the machine to rely on yet delegate more advanced logic to external services.

Some specific examples of this include:

- delegating to a signing module that verifies whether a given action is safe to sign & countersign
- storing state commitments (delegating to an arbitrary, possibly non-local service implementing a desired interface)
- implementing a custom Write-Ahead-Log to tweak performance/security properties

Note that because of this architecture, the machine becomes embeddable and its surrounding context can decide how to implement/extend needed functionality/services.

## Usage

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
cd packages/machine
```

You also need to migrate the contracts in the contracts package to generate a `networks` file which the `machine` package directly consumes (for now).

```shell
cd ../contracts
yarn migrate
cd ../machine
```

Finally, to run all tests:

```shell
yarn test
```
