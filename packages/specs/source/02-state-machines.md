# State Machine Based Applications

The following is a loose description of the concepts we use for an off-chain application. Most importantly, the `AppRegistry` is the actual contract that is responsible for adjudicating a challenge on-chain and it uses an `App` (defined using an `AppDefinition`) to handle cases where adjudication requires on-chain logic to determine state validity.

## AppRegistry

We refer to the contract that adjudicates a dispute in a state channel application as the [`AppRegistry`](#appregistry). This is the most fundamental contract for providing the security guarantees that off-chain state updates of the latest nonce and valid update status can be considered "final". It does this by implementing the challenge-response mechanism.

An app challenge exists in three main states or "statuses", namely `ON`, `OFF` and `DISPUTE`. The `ON` state represents the state where a dispute has not started, while the `OFF` state represents one where a dispute has finished (typically through moving to a terminal app state). In the Solidity code this is implemented as an `enum`:

```solidity
enum AppStatus {
  ON,
  DISPUTE,
  OFF
}
```

The `AppChallenge` struct (which is written to storage in `AppRegistry`) is the encapsulation of all the information needed to know what is the "latest" state pertaining to an application. The fields include `status` a hash of the application's state and a nonce.

```solidity
struct AppChallenge {
  AppStatus status;
  bytes32 appStateHash;
  uint256 finalizesAt;
  uint256 nonce;
  ...
}
```

In addition, an app in a `DISPUTE` state has a `finalizesAt` field representing the block height after which the conditional transfer succeeds. Hence, the functions in `AppRegistry.sol` distinguish between four logical states: `ON`, `DISPUTE`, `DISPUTE-TIMED-OUT` and `OFF`.

The first two logical statuses (`ON`, `DISPUTE`) are also called “channel on”, and the other two (`DISPUTE-TIMED-OUT`, `OFF`) are called “channel off”.

![statechannel statuses](img/statechannel-statuses.svg)

> TODO: enumerate methods defined on AppRegistry.sol that can change status

## AppDefinitions

Counterfactual is opinionated in terms of which types of applications it supports being installed by supporting stateless contracts that implement the interface for an `App` as defined in the [`AppRegistry`](#appregistry) contract. To understand why these limitations exist, please refer to the [Limitations of State Channels](#limitations) section.

The actual `App` functionality is isolated and defined in a single stateless contract referred to as the App Definition contract. This contract defines the data structure used for app state, typically a struct named `AppState`, as well as app logic through non-storage-modifying functions. By non-storage-modifying we mean that they cannot use the `SSTORE` instruction; this corresponds to the solidity function modifiers `pure` or `view`. To enforce this restriction, these functions are called through the `STATICCALL` opcode in the [`AppRegistry`](#appregistry) contract.

Up to four functions can be implemented. The signatures are as follows:

- `isStateTerminal: AppState → bool`
- `getTurnTaker: AppState → uint256`
- `applyAction: (AppState, Action) → AppState`
- `resolve: AppState → Transfer.Transaction`

In designing the framework we must try to achieve two sometimes contradictory goals. On the one hand, we wish to allow app developers to view application state as a structured data type, the same way the developer of a non-channelized dapp would interact with contract storage. On the other hand, the framework would like to treat application state as a blob of unstructured data. Current limitations around the Solidity type system sometimes put these in conflict; for instance, we enforce the limitation that the `AppState` struct must not be dynamically sized.

Another consequence is that the return type of `applyAction` is actually `bytes`. We expect that application developers simply end their `applyAction` function with something like

`return abi.encode(nextState);`

where `nextState` has type `AppState`.

> In the future, improvements such as `abi.decode` will allow us to remove these and other restrictions and move to a cleaner API.

### `applyAction` and `getTurnTaker`: The Application State Transition Function

If `AppState` defines the data structure needed to represent the state of an app instance, `applyAction` defines the app logic that operates on the app. In a Tic-Tac-Toe game, `AppState` represents the state of the board, and `applyAction` and `getTurnTaker` together implement the logic of Tic-Tac-Toe. The return value of `getTurnTaker` corresponds to an address which can unilaterally update the app state. This update is done through the `applyAction` function; the caller also specifies the type of update (e.g. placing an X at a certain place on the board) by passing in additional data of type `struct Action` (this struct is also defined by the app developer).

![](img/applyAction.svg)

### resolve

From certain app states, `resolve` can be called to return a value of type `struct Transfer.Transaction` (this is defined by framework code in `Transfer.sol`). This allows the state deposit assigned to the app to be reassigned, for e.g., to the winner of the Tic-Tac-Toe game.

![](img/resolve.svg)

### isStateTerminal

Some app states are marked terminal. An app state `a` is terminal if there does not exist an action `c` such that `applyAction(a, c)` returns without throwing. In other words, the app state transition graph has no outgoing edges from `a`. Since we cannot statically check this property, the app developer can manually mark these states by making `isStateTerminal` return true for them, allowing us to skip one step of dispute resolution.

Note that this is an optimization; this function can always safely be omitted, at the cost that sometimes disputes would take longer than strictly necessary.
