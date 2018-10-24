# Counterfactual Specification

![](https://img.shields.io/badge/status-wip-orange.svg?style=svg)
![Discord](https://img.shields.io/discord/500370633901735947.svg)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=svg)](https://github.com/RichardLitt/standard-readme)

> This repository contains the specs for the Counterfactual Protocol and associated subsystems.

## Table of Contents

- [Architecture](#architecture)
- [Properties](#properties)
- [Specs](#specs)

## Architecture

Counterfactual implements a general purpose protocol for using state channels, an important technique for reducing fees for blockchain users. Within their scope of applicability, they allow users to transact with each other without paying blockchain transaction fees and with instant finality, and are the only technique that securely realises the latter property.

With this approach, participants begin by depositing blockchain state into the possession of an n-of-n multisignature wallet. Then, they proceed to exchange cryptographically signed messages through an arbitrary communication channel. These messages are either pre-signed transactions to distribute the blockchain state or state updates relevant relevant to those commitments that change the distribution. The protocol that defines what kinds of messages are exchanged to ensure secure off-chain state updates is described in depth in the [protocol](/v1/protocol.md) section.

Through a challenge-response mechanism, on-chain contracts implement a method for participants to ensure the latest signed valid state update that pertains to their commitment can be submitted to the blockchain to guarantee fair adjudication of the state.

Counterfactual uses a generic system of Ethereum smart contracts to support artbitrary conditional transactions of blockchain state owned by a multisignature wallet. For a full explainer of the contracts layer, please read the [contracts](/v1/contracts.md) subsection.

## Properties

Counterfactual has been designed to attain the following properties.

### Minimized on-chain footprint

We don’t want to put anything on the chain that doesn’t need to be. In our designs, we have aimed to make the only necessary on-chain object for a state channel to be a generic multisignature wallet.

### Maximized privacy

We want to achieve a level of privacy where state channel operations are indistinguishable from other common types of on-chain activities. Using a state channel should not reveal any information about the applications that are being used, the state being used within them, or even the fact that a state channel is being used at all. To achieve this property, we assume that the on-chain component is a generic multisignature wallet which looks the same as any other multisignature wallet on Ethereum.

### Ease-of-use

We want channels that can be easily incorporated into new applications without the requirement for those developers to also be state channel experts. For this property we have defined an abstraction for state channel applications that we call "Apps". These "Apps" are simple stateless contracts which just define the state machine for an application including valid transitions and turn-taking logic. We restrict the kinds of applications that are written to be the kinds that fit within the [limitations](#limitations) of state channels.

### Parallel operations

We want to see support for multiple parallel operations inside of a single channel that do not interfere with each other. We have designed "Apps" to be kinds of running off-chain applications that have state assigned to them completely independently of each other. Typical operations like installing new applications, uninstalling old applications, and updating applications are all parallelizable operations with respect to other apps using the [Counterfactual protocol](/v1/protocols).

### Upgradeable

We want to support deploying or upgrading channel designs without requiring the user to make a single on-chain operation. There are multiple ways that we are able to achieve this and that we are designing for. For the purposes of _trustless_ off-chain upgradability, we are able to support counterfactually instantiated smart contracts as applications. To upgrade a contract trustlessly, state channel participants simply agree to a new version of bytecode their applications pertains to and move on with that. With trust, state channel participants can use an application that is defined using [ZeppelinOS's upgradeable contracts](https://docs.zeppelinos.org/docs/building.html).

### Standardized

We want to establish clear standards for how all of these generalized state channels will fit together into a global, multi-blockchain network where any user can easily connect to any other. To achieve this goal, we've worked closely with great researchers from [Celer](https://celer.network), [Magmo](https://magmo.com), [Ethereum Research](http://eth.sg) and several others. We hope to amplify these efforts to work towards blockchain standards for off-chain channelized applications more broadly.

## Limitations

1. **Conflict-free data structures.** Since state updates happen off-chain in state channels, there is a need to replicate the ordering property of a blockchain through a conflict-free data structure. In Counterfactual, we currently support turn-based state machines where the participant authorized to take their take (an action) is defined as a function of the state of an `App`.

2. **Public auditability.** State channel applications cannot declare the state within the application to the public in a way that can be considered by the public as the latest state. For example, there is no equivalent to Etherscan for off-chain state since it is always possible for the participants of a state channel to falsify their claims.

## Specs

The specs contained in this repository are:

- [protocols](/v1/protocols.md) - The Counterfactual protocol for off-chain applications
- [contracts](/v1/contracts.md) - The on-chain smart contracts that implement properties of Counterfactual

## Contribute

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with Counterfactual, the models it adopts, and the principles it follows.

Feel free to join in and open an issue or chat with us on [discord](https://counterfactual.com/chat)!