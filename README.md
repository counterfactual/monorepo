# Specifications

[![](https://img.shields.io/badge/made%20by-L4-black.svg?style=flat-square)](http://l4v.io)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> This repository contains the specs for the Counterfactual Protocol and associated subsystems.

## Table of Contents

- [Specs](#specs)
- [Organization](#organization)
- [Specs](#specs)
- [Design](#design)
- [Protocols](#protocols)
- [Roadmap](#roadmap)

## Specs

For an introduction to concepts and terminology behind state channels, please see [this paper](https://counterfactual.com/statechannels).

We recapitulate some relevant definitions. In some cases we use definitions that are more specialized (less general) than in the paper.

- **state deposit**: blockchain state locked into a state channel
- **state deposit holder**: the on-chain multisignature wallet that holds the state deposit
- **counterfactual instantiation**: the process by which parties in a state channel agree to be bound by the terms of some off-chain contract
- **counterfactual address**: an identifier of a counterfactually instantiated contract that is deterministically computed from the code and the channel in which the contract is instantiated
- **commitment**: a signed transaction (piece of data) that allows the owner to perform a certain action
- **action**: a type of commitment; an action specifies a subset of transactions from the set of all possible transactions
- **conditional transfer**: the action of transferring part of the state deposit to a given address if a certain condition is true; hence one may speak of a commitment to a conditional transfer.

Note that section 6 of the paper specifies a concrete implementation that differs from the design of our implementation. The reason for this divergence is explained later.

## Organization

These documents include a high-level design overview of the protocols. A high-level design specifies the actions that parties commit to and dependencies between commitments, as well the contract functionality necessary to enforce these commitments. In addition, there are separate specs that specify the contract behaviour and interface in more detail, as well as a specification of the data format of the commitments and protocol messages.

### Proposed Changes

Sometimes, there are multiple designs that provide the same features but with different tradeoffs. We describe these designs in the [proposed](proposed) folder, in order to have a single place to reference them, but with the understanding that they are not currently being implemented. We also place here designs that add new features when they are still in the evaluation phase.

### Criteria

The file [proposed/criteria.md](proposed/criteria.md) contains criteria for proposed protocol designs. A criteria is a predicate that a protocol design either satisfies or does not.

## Design

A state channel is an on-chain multisig state deposit holder, a set of counterfactually instantiated state channel apps, the set of dependency nonces, the set of signed commitments (stored by each participant locally), and any other state needed for disputes or to perform operations in the channel.

### Commitments 

We recall the definition of a commitment as a signed transaction (piece of data) that allows the owner to perform a certain action. More precisely, all our commitments consist of the parameters that should be passed to `MinimumViableMultisig::execTransaction` and cause it to perform the action, which is to call the internal `MinimumViableMultisig::execute` function, which performs a message call originating from the multisig.

An simple example of an action is `execute(a, n, 0, 0)`, which transfers the `n` wei to the address `a`; this action is used in unanimous withdrawals.

Many actions are simply delegate calls a contract in the `delegateTargets` folder. These contracts execute "on behalf of" the multisig. The `Multisend` delegate target executes a set of `execute` statements atomically (i.e., if any of them fail, the whole transaction reverts). The `ConditionalTransfer` delegate target provides functionality that calls another contract to receive a `Transfer` object that represents some allocation of blockchain assets (either ether or ERC20 tokens), checks it against a limit, and then transfers assets.

### Apps

A state channel application (app) is a collection of counterfactual state and functionality that holds the right to allocate some portion of the state deposit of the state channel that it belongs to. An example of a state channel app is a chess game. Multiple apps of the same type (e.g., multiple chess games) can be installed into the same channel.

An app is also the interface that developers wishing to write channelized code deals with, in that they write an app that encapsulates the functionality that they want to offer users, which can then be installed by users into a channel. Hence, there is a mixing of framework code (written by us) and code written by app developers. See the [contracts](contracts/README.md) folder for details about how this is managed.

### Nonces

There are two types of nonces, or sequence numbers, used in the code. The first is used by an app and is linked to an app state, and is used to determine which signed state is more recent. The second type is called a dependency nonce and is implemented by the `NonceRegistry` contract. Its purpose is simply that certain commitments depend on them being a certain value. We explain why this is useful in the next section.

### Multiple Apps

One key feature of state channels we support is that multiple applications can be installed without any on-chain transactions, and multiple applications may run simultaneously. When users are done with an application (e.g., one player wins a chess game, or the expiry time on a financial option has passed), the app can be uninstalled and the state deposit assigned to it freed up to be assigned to other apps.

An app that is installed but not uninstalled is called an active app.

The state deposit locked in the multisig should be equal to the sum of the state deposit held by all apps in the channel. This property is called *conservation of balance*. There is a special app called the Free Balance app that is the "default place" to hold state deposit. The app logic is implement by `PaymentChannel.sol`.

To support easy uninstallation of apps, each app has its own dependency nonce.

### Cleanup

TBD

## Protocols

### Setup

TBD

### Install

The install commitment is a multisend that

- sets the app dependency nonce to 1
- sets the freebalance state to a new state with some balance removed
- does a conditional transfer

### Update

The update commitment sets the app state hash.

### Uninstall

The uninstall commitment is a multisend that

- sets the app dependency nonce to 2
- sets the freebalance state to a new state with some balance added

## Cleanup

TBD

## Roadmap

Here is a list of future features we wish to support someday (TM).

- Protocol message specification for multi-party channels
- Designs for metachannels
- Designs for onion-routed metachannels
- Designs for hash nonces and merkelized multisigs
- Designs for watchtowers
