# [Counterfactual](https://counterfactual.com) In-Progress Specifications 

The specifications are currently a work-in-progress and are currently being drafted. We welcome any pull requests, comments, or general feedback on the notes below. Additionally, you can chat with us on [our discord server](https://counterfactual.com/chat) if you'd like.

## Introduction

Counterfactual is a state channels based protocol for off-chain blockchain-based applications.

Counterfactual implements a general purpose protocol for using state channels, an important technique for reducing fees for blockchain users. State channels allow users to transact with each other without paying blockchain transaction fees and with instant finality. They are the only technique that securely realises the latter property.

With this approach, participants begin by depositing blockchain state into the possession of an n-of-n multisignature wallet. Then, they exchange cryptographically signed messages through an arbitrary communication channel. These messages are either pre-signed transactions to distribute the blockchain state or state updates relevant to those commitments that change the distribution. The protocol that defines what kinds of messages are exchanged to ensure secure off-chain state updates is described in depth in the [protocol](./00-protocols.md) section.

Through a challenge-response mechanism, on-chain contracts implement a method for participants to ensure the latest signed valid state update that pertains to their commitment can be submitted to the blockchain to guarantee fair adjudication of the state.

Counterfactual uses a generic system of Ethereum smart contracts to support artbitrary conditional transactions of blockchain state owned by a multisignature wallet. For a full explainer of the contracts layer, please read the [contracts](./01-contracts.md) subsection.

Counterfactual has been designed to satisfy the following goals.

### Minimized on-chain footprint

We don’t want to put anything on the chain that doesn’t need to be. We aim to make a a generic multisignature wallet the only necessary on-chain object for a state channel.

### Maximized privacy

We want to achieve a level of privacy where state channel operations are indistinguishable from other common types of on-chain activities. Using a state channel should not reveal any information about the applications that are being used, the state being used within them, or even the fact that a state channel is being used at all. To achieve this property, we assume that the on-chain component is a generic multisignature wallet which looks the same as any other multisignature wallet on Ethereum.

### Ease-of-use

We want channels that can be easily incorporated into new applications without the requirement for those developers to also be state channel experts. For this property we have defined an abstraction for state channel applications that we call "Apps". These "Apps" are simple stateless contracts which just define the state machine for an application including valid transitions and turn-taking logic. We restrict the kinds of applications that are written to be the kinds that fit within the [limitations](#limitations) of state channels.

### Parallel operations

We want to see support for multiple parallel operations inside of a single channel that do not interfere with each other. We have designed "Apps" to be kinds of running off-chain applications that have state assigned to them completely independently of each other. Typical operations like installing new applications, uninstalling old applications, and updating applications are all parallelizable operations with respect to other apps using the [Counterfactual protocol](./00-protocols.md).

### Upgradeable

We want to support deploying or upgrading channel designs without requiring the user to make a single on-chain operation. There are multiple ways that we are able to achieve this and that we are designing for. For the purposes of _trustless_ off-chain upgradability, we are able to support counterfactually instantiated smart contracts as applications. To upgrade a contract trustlessly, state channel participants simply agree to a new version of bytecode their applications pertains to and move on with that. With trust, state channel participants can use an application that is defined using [ZeppelinOS's upgradeable contracts](https://docs.zeppelinos.org/docs/building.html).

### Standardized

We want to establish clear standards for how all of these generalized state channels will fit together into a global, multi-blockchain network where any user can easily connect to any other. To achieve this goal, we work closely with great researchers from [Celer](https://celer.network), [Magmo](https://magmo.com), [Ethereum Research](http://eth.sg) and several others. We hope to amplify these efforts to work towards blockchain standards for off-chain channelized applications more broadly.

## Glossary and Terminology Guide

For an introduction to concepts and terminology behind state channels, please see the [original paper](https://l4.ventures/papers/statechannels.pdf).

- _State Deposit_:
  - Any kind of blockchain state locked into a state channel. This could be directly ETH, ownership of an ERC20 token, or any other kind of state.
  
- _State Deposit Holder_:
  - The on-chain multisignature wallet smart contract that is the "owner" the state deposit

- _Counterfactual Instantiation_:
  - The process by which parties in a state channel agree to be bound by the terms of some off-chain contract
  
- _Counterfactual Address_:
  - An identifier of a counterfactually instantiated contract that is deterministically computed from the code and the channel in which the contract is instantiated

- _Commitment_:
  - A signed transaction (piece of data) that allows the owner to perform a certain action
 
- _Action_: a type of commitment; an action specifies a subset of transactions from the set of all possible transactions
conditional transfer: the action of transferring part of the state deposit to a given address if a certain condition is true.

Note that section 6 of the paper specifies a concrete implementation that differs from the design of our implementation. The reason for this divergence is explained later.
