# Counterfactual Smart Contracts <img align="right" src="https://static1.squarespace.com/static/59ee6243268b96cc1fb2b14a/t/5af73bca1ae6cf80fc1cc250/1529369816810/?format=1500w" height="80px" />

#### ⚠️️️ This is experimental software, do not use in production
All of the code presented in this repository has not been audited and using it in production can cause loss of funds. Use cautiously!

## Introduction

Counterfactual is a framework for developing applications using state channels. Find out more about what this means below!

- New to layer 2 scaling? Read [Introduction to Layer 2 Scaling](https://medium.com/l4-media/making-sense-of-ethereums-layer-2-scaling-solutions-state-channels-plasma-and-truebit-22cb40dcc2f4)
- Want to understand how we think about state channels? Read [this blog post](https://medium.com/statechannels/counterfactual-generalized-state-channels-on-ethereum-d38a36d25fc6)
- Want the full technical details? Read our paper [Counterfactual: Generalized State Channels](https://l4.ventures/papers/statechannels.pdf)

## Features

### 📱 Multiple Applications

By using state commitments and deterministic addressing, Counterfactual supports the ability to install and uninstall applications within a channel without any on-chain transactions.

### 🕸️ Channel Networks

Interact with anyone across a network of channels (subject to collateral constraints) and get all the benefits of channelization without having to open a channel with your counterparties.

### 💻 Familar Redux-Like API

We expose a redux-like stateless API for application developers. We use native ABIEncoderV2 integration to allow developers to specify their own application data layout.

## Architecture Overview

Counterfactual provides a small and clean API for application developers to program against. It is designed to allow a clean separation of application-specific code written by an app developer and framework written by us. Application-specific code is isolated in a stateless contract. Examples of these contracts can be seen in the repository `cf-apps`.

When disputes occur, an instance of the contract [`StateChannel.sol`](https://github.com/counterfactual/contracts/blob/master/contracts/StateChannel.sol) is placed on chain together with a small amount of state. This contract also manages the dispute flow. Upon resolution of a dispute, apps return a struct called `Transfer.Details` to determine who gets the value-at-stake, and for common types of value-at-stake, the framework enforces a maximum amount of value transferable.

State deposit is stored in a multisig wallet (`MinimumViableMultisig.sol`). Apps are installed by signing commitments from the multisig (`delegateTargets/ConditionalTransfer.sol`). Deterministic addressing for counterfactually instantiated objects is provided through a registry (`Registry.sol`).

## Contributing

Counterfactual is an open-source project. Development happens in the open on GitHub, and we welcome bugfixes and improvements from the community.

### Security

If you find a security issue, please contact us at security@counterfactual.com.

### License

Code released under the [MIT License](LICENSE)
