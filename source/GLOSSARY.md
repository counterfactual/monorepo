# Glossary and Terminology Guide

For an introduction to the concepts and terminology behind state channels, please see the [original paper](https://l4.ventures/papers/statechannels.pdf).

## State Deposit

Any kind of blockchain state controlled directly by a state channel. This could be an ETH balance, ownership of an ERC20 token, control over an ENS name registration, or any other kind of state.

## State Deposit Holder

The on-chain multisignature wallet smart contract that is the "owner" of a given state deposit

## Counterfactual Instantiation

The process by which parties in a state channel agree to be bound by the terms of some off-chain contract

## Counterfactual Address

An identifier of a counterfactually instantiated contract, which can be deterministically computed from the code and the channel in which the contract is instantiated

## Commitment

A signed transaction (piece of data) that allows the owner to perform a certain action

## Action

A type of commitment; an action specifies a subset of transactions from the set of all possible transactions
conditional transfer: the action of transferring part of the state deposit to a given address if a certain condition is true.

> NOTE: Section 6 of the paper specifies a concrete implementation that differs in certain respects from the protocol described here. The reason for this divergence is explained later.
