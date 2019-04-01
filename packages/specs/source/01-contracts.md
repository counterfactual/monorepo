# Contracts Architecture

## Multisignature Wallet

A multisignature wallet is the only required on-chain component for a state channel to work. Although we provide an example implementation, we believe the following properties should become standards in any multisignature wallet on Ethereum and Counterfactual will work with any wallet contract that implements them.

1. Executes arbitrary message calls (`CALL` or `DELEGATECALL`), including ability to specify destination address, value, and message data.

2. Implements hash-bashed replay protection as opposed to nonce-based.

3. Supports n-of-n unanimous consent.

4. Verifies signatures that are not required to commit to the on-chain address of the contract.

## StateChannelTransaction

The `StateChannelTransaction` contract is a target contract for a multisignature wallet to call using `DELEGATECALL`. Its purpose is to define logic for resolving a conditional transaction that adheres to the protocol.

> TODO: Provide more information and context on this contract.

## NonceRegistry

> TODO: Provide more information and context on this contract.

## ContractRegistry

> TODO: Provide more information and context on this contract.
