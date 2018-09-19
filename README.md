# specs

This repository contains specifications for the counterfactual protocols and contracts.

## Concepts

For an introduction to concepts and terminology behind state channels, please see [this](https://counterfactual.com/statechannels).

We recapitulate some relevant definitions. In some cases we use definitions that are more specialized (less general) than in the paper.

- state deposit: blockchain state locked into a state channel
- state deposit holder: the on-chain multisignature wallet that holds the state deposit
- counterfactual instantiation: the process by which parties in a state channel agree to be bound by the terms of some off-chain contract
- counterfactual address: an identifier of a counterfactually instantiated contract that is deterministically computed from the code and the channel in which the contract is instantiated
- commitment: a signed transaction (piece of data) that allows the owner to perform a certain action
- conditional transfer: the action of transferring part of the state deposit to a given address if a certain condition is true. hence one may speak of a commitment to a conditional transfer.

Note that section 6 of the paper specifies a concrete implementation that differs from the design of our implementation. The reason for this divergence is explained later.

## Organization

These documents include a high-level design overview of the protocols. These should specify the types of commitments we make and dependencies between commitments, as well as a description of the contract functionality and how they enforce these commitments. In addition, there are separate specs that specify the contract behaviour and interface in more detail, as well as a specification of the data format of the commitments and protocol messages.

### Proposed Changes

Sometimes, there are multiple designs that provide the same features but with different tradeoffs. We describe these designs in the [proposed](proposed) folder, in order to have a single place to reference them, but with the understanding that they are not currently being implemented. We also place here designs that add new features when they are still in the evaluation phase.

### Criteria

The file [proposed/criteria.md](proposed/criteria.md) contains criteria for proposed protocol designs, i.e., predicates that a protocol design either satisfies or does not.

## Design

A state channel is an on-chain multisig state deposit holder, a set of counterfactually instantiated state channel apps, the set of dependency nonces, the set of signed commitments (stored by each participant locally), and any other state needed for disputes or to perform operations in the channel.

### Commitments 

We recall the definition of a commitment as a signed transaction (piece of data) that allows the owner to perform a certain action. More precisely, all our commitments consist of the parameters that should be passed to `MinimumViableMultisig::execTransaction` and cause it to call the internal `MinimumViableMultisig::execute` function, which performs a message call from the multisig.

An example of a simple commitment is a commitment to call `execute(a, n, 0, 0)`, which transfers the `n` wei to the address `a`, and is used in unanimous withdrawals.

Many commitments are commitments to delegatecall a contract in the `delegateTargets` folder. These contracts hence execute "on behalf of" the multisig. The `Multisend` delegate target executes a set of `execute` statements atomically (i.e., if any of them fail, the whole transaction reverts). The `ConditionalTransfer` delegate target provides functionality that calls another contract to receive a `Transfer` object that represents some allocation of blockchain assets (either ether or ERC20 tokens), checks it against a limit, and then transfers assets.

### Apps

See [ARCHITECTURE.md](ARCHITECTURE.md).

### Installation, Uininstallation and Dependency Nonces

An app that is installed but not uninstalled is called an active app.

### Free Balance

State deposit that is not assigned to any other app is held in a special app called the Free Balance app. The app logic is implement by `PaymentChannel.sol`.

## Protocols

### Setup

### Install

### Update

### Uninstall

## Roadmap

Here is a list of future features we wish to support someday (TM).

- Protocol message specification for multi-party channels
- Designs for metachannels
- Designs for onion-routed metachannels
- Designs for hash nonces and merkelized multisigs
- Designs for watchtowers