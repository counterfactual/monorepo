# Specifications

![Discord](https://img.shields.io/discord/500370633901735947.svg)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> This repository contains the specs for the Counterfactual Protocol and associated subsystems.

## Table of Contents

- [Specs](#specs)
- [Organization](#organization)
- [Specs](#specs)
- [Design](#design)
- [Protocols](#protocols)
- [Roadmap](#roadmap)

## Architecture

Counterfactual implements a general purpose protocol for using state channels, an important technique for reducing fees for blockchain users. Within their scope of applicability, they allow users to transact with each other without paying blockchain transaction fees and with instant finality, and are the only technique that securely realises the latter property.

With this approach, participants begin by depositing blockchain state into the possession of an n-of-n multisignature wallet. Then, they proceed to exchange cryptographically signed messages through an arbitrary communication channel. These messages are either pre-signed transactions to distribute the blockchain state or state updates relevant relevant to those commitments that change the distribution. The protocol that defines what kinds of messages are exchanged to ensure secure off-chain state updates is described in depth in the [protocol](/protocol) section.

Through a challenge-response mechanism, on-chain contracts implement a method for participants to ensure the latest signed valid state update that pertains to their commitment can be submitted to the blockchain to guarantee fair adjudication of the state.

Counterfactual uses a generic system of Ethereum smart contracts to support artbitrary conditional transactions of blockchain state owned by a multisignature wallet. For a full explainer of the contracts layer, please read the [contracts](/contracts) subsection.

## Specs

The specs contained in this repository are:

- [protocols](/protocols) - The Counterfactual protocol for off-chain applications
- [contracts](/contracts) - The on-chain smart contracts that implement properties of Counterfactual
- [research](/research) - The research the protocol makes use of

## Limitations

1. **Conflict-free data structures.** Since state updates happen off-chain in state channels, there is a need to replicate the ordering property of a blockchain through a conflict-free data structure. In Counterfactual, we currently support turn-based state machines where the participant authorized to take their take (an action) is defined as a function of the state of an `App`.

2. **Public auditability.** State channel applications cannot declare the state within the application to the public in a way that can be considered by the public as the latest state. For example, there is no equivalent to Etherscan for off-chain state since it is always possible for the participants of a state channel to falsify their claims.

## Contribute

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with Counterfactual, the models it adopts, and the principles it follows.

Feel free to join in and open an issue or chat with us on [discord](https://counterfactual.com/chat)!