# Introduction

The Node contains a TypeScript implementation of the [Counterfactual protocol](https://specs.counterfactual.com). It is responsible for executing the protocols and producing correctly constructed signed commitments that correspond to state transitions of the users' state channels.

The main areas of interest with this implementation are:

- `src/engine/instruction-executor.ts`: This is the entry point for running a protocol.
- `src/protocol` is where all the protocols are implemented
- `src/ethereum` is where the structure of the commitments is placed. It's under this folder as these commitments adhere to the Ethereum network's interface for transactions.

The specific design philosophy for this implementation is the middleware pattern. That is, all of these protocols are naturally broken down into steps, for each of which there is a middleware responsible for executing that step.

Given this design, it's easy to extend this implementation to support additional protocols, replace a default middleware with an alternative implementation, and for the machine to rely on yet delegate more advanced logic to external services.

Some specific examples of this include:

- delegating to a signing module that verifies whether a given action is safe to sign & countersign
- storing state commitments (delegating to an arbitrary, possibly non-local service implementing a desired interface)
- implementing a custom Write-Ahead-Log to tweak performance/security properties

We have [some diagrams](./diagram.md) explaining the Node's architecture and control flow.

## Node Address and Signing Keys

The Node is expected to have access to an [extended private key](https://bitcoin.org/en/wallets-guide#hierarchical-deterministic-key-creation) which it uses to derive a "public identifier" used as the address of a Node instance. This key is also used to produce private keys at app-specific derivation paths.

This key is expected to be provided at the "EXTENDED_KEY" key of the Store service that is passed as an argument to the Node. If no such value exists for this key, the Node produces an extended key and sets it at this key.

## Apps and OutcomeTypes

Each application that is installed in a channel has an `OutcomeType` that defines when the app reaches a terminal state and is about to be uninstalled how the funds allocated to it will be distributed.

The currently supported outcome types are:

- TWO_PARTY_FIXED_OUTCOME

  - This is only used when the installed app is collateralized with ETH (for now) and indicates that the total amount allocated to the app will be sent to one of the two parties OR gets split evenly.

- MULTI_ASSET_MULTI_PARTY_COIN_TRANSFER

  - This is used for transferring arbitrary amounts (limited by app collateral) of arbitrary asset classes (ETH or ERC20) to some addresses.

- SINGLE_ASSET_TWO_PARTY_COIN_TRANSFER

  - This is used for transferring arbitrary amounts (limited by app collateral) of a single asset class (ETH or ERC20) to some addresses.

## Note:

Any consumer of the Node should set up a handler for the event `DEPOSIT_CONFIRMED` so as to define how this Node behaves when a counter party has initiated a deposit and is asking this Node to make a counter deposit and collateralize the channel. The parameters passed with this event correspond to the same ones used by the initiator, tha is `DepositParams` (as defined in the `@counterfactual/types packages`).

If no such handler is defined, `No event handler for counter depositing into channel <info>` is printed indicating the Node does not know how to handle a counter deposit request.

