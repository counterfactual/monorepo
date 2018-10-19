# Specifications

![Discord](https://img.shields.io/discord/500370633901735947.svg)
[![standard-readme compliant](https://img.shields.io/badge/standard--readme-OK-green.svg?style=flat-square)](https://github.com/RichardLitt/standard-readme)

> This repository contains the specs for the Counterfactual Protocol and associated subsystems.

## Table of Contents

- [Architecture](#architecture)
- [Specs](#specs)

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

## Contribute

Suggestions, contributions, criticisms are welcome. Though please make sure to familiarize yourself deeply with Counterfactual, the models it adopts, and the principles it follows.

Feel free to join in and open an issue or chat with us on [discord](https://counterfactual.com/chat)!