# Contracts Architecture

## Multisignature Wallet

A multisignature wallet is the only required on-chain component for a state channel to work. Although we provide an example implementation, we believe the following properties should become standards in any multisignature wallet on Ethereum and Counterfactual will work with any wallet that implements them.

1. Execution of arbtirary transaction of the form `(address to, uint256 value, bytes data, uint8 op)` where `op` is a switch for defining either a `CALL` or `DELEGATECALL` internal transaction.

2. Hash-bashed replay protection as opposed to nonce-based.

3. Supports n-of-n unanimous consent.

4. Deterministic signature verification that does _not_ use the on-chain address of the contract.

## ConditionalTransaction

The `ConditionalTransaction` contract is a target contract for a multisignature wallet to call using `DELEGATECALL`. Its purpose is to define logic for resolving a conditional transaction that adheres to the protocol.

> TODO: Provide more information and context on this contract.

## NonceRegistry

> TODO: Provide more information and context on this contract.

## Registry

> TODO: Provide more information and context on this contract.