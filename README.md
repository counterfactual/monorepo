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

## Organization

High-level protocol, low-level protocol, contracts.

Proposed changes.

## Criteria

## Contracts

## Protocols