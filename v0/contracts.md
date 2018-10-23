# Contracts Architecture

## Multisignature Wallet

A multisignature wallet is the only required on-chain component for a state channel to work. Although we provide an example implementation, we believe the following properties should become standards in any multisignature wallet on Ethereum and Counterfactual will work with any wallet that implements them.

1. Execution of arbtirary transaction of the form `(address to, uint256 value, bytes data, uint8 op)` where `op` is a switch for defining either a `CALL` or `DELEGATECALL` internal transaction.

2. Hash-bashed replay protection as opposed to nonce-based.

3. Supports n-of-n unanimous consent.

4. Deterministic signature verification that does _not_ use the on-chain address of the contract.

## AppInstance

We refer to the contract that adjudicates a dispute in a state channel application as an [`AppInstance`](#appinstance). This is the most fundamental contract for providing the security guarantees that off-chain state updates of the latest nonce and valid update status can be considered "final". It does this by implementing the challenge-response mechanism.

An AppInstance exists in three main states or “statuses”, namely `ON`, `OFF` and `DISPUTE`. The `ON` state represents the state where a dispute has not started, while the `OFF` state represents one where a dispute has finished (typically through moving to a terminal app state). In the Solidity code this is implemented as an `enum`:

```solidity
enum Status {
  ON,
  DISPUTE,
  OFF
}
```

In the stored state channel `State` struct, which is the encapsulation of all the information needed to know what is the "final" state pertaining to an application, the `Status` variable is included in addition to the hash of the application's state and a nonce.

```solidity
struct State {
  Status status;
  bytes32 appStateHash;
  uint256 nonce;
  uint256 finalizesAt;
  ...
}
```

In addition, an app in a `DISPUTE` state has a `finalizesAt` field representing the block height before which a responding `progressDispute` call must be made. Hence, the functions in `AppInstance.sol` distinguish between four logical states: `ON`, `DISPUTE`, `DISPUTE-TIMED-OUT` and `OFF`.

The first two logical statuses (`ON`, `DISPUTE`) are also called “channel on”, and the other two (`DISPUTE-TIMED-OUT`, `OFF`) are called “channel off”.

![statechannel statuses](./img/statechannel-statuses.svg)

To transition between these states, Counterfactual defines an interface to an AppInstance that can be used to transition between the logical states defined above.

- [`setState`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/AppInstance.sol#L161) (`ON` to `DISPUTE`): Supports submitting the latest signed state and turning on the timer.
- [`createDispute`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/AppInstance.sol#L214) (`ON` to `DISPUTE`): Supports submitting latest state _and_ a valid action on the state.
- [`progressDispute`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/AppInstance.sol#L301) (`DISPUTE` to `DISPUTE`): Supports submitting a valid action that progresses the state.
- [`cancelDispute`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/AppInstance.sol#L359) (`DISPUTE` to `ON`): Supports unanimously cancelling the dispute and resuming off-chain.

There is additionally a final function that sets the resolution of an off-chain application to be determined if the AppInstance is in an `OFF` state (after a timeout has occured).

- [`setResolution`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/AppInstance.sol#L387)

## AppDefinitions

Counterfactual is opinionated in terms of which types of applications it supports being installed by strictly supporting stateless contracts that implement the interface for an `App` as defined in the [`AppInstance`](#appinstance) contract. To understand why these limitations exist, please refer to the [Limitations of State Channels](#limitations) section.

The actual `App` functionality is isolated and defined in a single stateless contract. This contract defines the data structure used for app state, typically a struct named `AppState`, as well as app logic through non-state-modifying functions. By non-state-modifying we mean that they cannot use the `SSTORE` instruction; this corresponds to the solidity function modifiers `pure` or `view`. To enforce this restriction, these functions are called through the `STATICCALL` opcode in the [`AppInstance`](#appinstance) contract.

Up to four functions can be implemented. The signatures are as follows:

- `isStateTerminal: AppState → bool`
- `getTurnTaker: AppState → uint256`
- `applyAction: (AppState, Action) → AppState`
- `resolve: AppState → Transfer.Transaction`

In designing the framework we must try to achieve two sometimes contradictory goals. On the one hand, we wish to allow app developers to view application state as a structured data type, the same way the developer of a non-channelized dapp would interact with contract storage. On the other hand, the framework would like to treat application state as a blob of unstructured data. Current limitations around the Solidity type system sometimes put these in conflict; for instance, we enforce the limitation that the `AppState` struct must not be dynamically sized. In the future, improvements such as abi.decode will allow us to remove these and other restrictions and move to a cleaner API.

Another limitation is that the return type of `resolve` is actually `bytes`. We expect that application developers simply end their `resolve` function with something like

`return abi.encode(nextState);`

where `nextState` has type `AppState`.

### `applyAction` and `getTurnTaker`: The Application State Transition Function

If `AppState` defines the data structure needed to represent the state of an app instance, `applyAction` defines the app logic that operates on the app. In a Tic-Tac-Toe game, `AppState` represents the state of the board, and `applyAction` and `getTurnTaker` together implement the logic of Tic-Tac-Toe. The return value of `getTurnTaker` corresponds to an address who can unilaterally update the app state. This update is done through the `applyAction` function; the caller also specifies the type of update (e.g. placing an X at a certain place on the board) by passing in additional data of type `struct Action` (this struct is also defined by the app developer).

<center>
    <br />
    <img src="./img/applyAction.svg" height="300">
    <br />
</center>

### resolve

From certain app states, `resolve` can be called to return a value of type `struct Transfer.Transaction` (this is defined by framework code in `Transfer.sol`). This allows the state deposit assigned to the app to be reassigned, for e.g., to the winner of the Tic-Tac-Toe game.

<center>
    <br/>
    <img src="./img/resolve.svg" height="250">
    <br/>
</center>

### isStateTerminal

Some app states are marked terminal. An app state `a` is terminal if there does not exist an action `c` such that `applyAction(a, c)` returns without throwing. In other words, the app state transition graph has no outgoing edges from `a`. Since we cannot statically check this property, the app developer can manually mark these states by making `isStateTerminal` return true for them, allowing us to skip one step of dispute resolution.

Note that this is an optimization; this function can always safely be omitted, at the cost that sometimes disputes would take longer than strictly necessary.

## ConditionalTransaction

The `ConditionalTransaction` contract is a target contract for a multisignature wallet to call using `DELEGATECALL`. Its purpose is to define logic for resolving a conditional transaction that adheres to the protocol.

## NonceRegistry

TODO
