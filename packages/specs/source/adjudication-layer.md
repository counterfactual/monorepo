# Adjudication Layer

Counterfactual's adjudication layer uses a singleton contract called the [`AppRegistry`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/AppRegistry.sol).

The implementation that is inside of this repository has been designed to only be compatible with applications that implement the [`CounterfactualApp`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/CounterfactualApp.sol) interface. Although this is the case, the core concepts are agnostic to the underlying interface that a state channels application might implement. A future version of the `AppRegistry` might support other types of state channel architectures such as [Force Move Games](https://github.com/magmo/force-move-games), for example.

The two core concepts of the adjudication layer are **challenges** and **resolutions**. Challenges are the adjudication layer's mechanism to _learn the final state_ of an off-chain application and resolutions _distribute state deposits_ based on the resolution. As a concrete example, a challenge might be about the state of the board in a game of Tic-Tac-Toe and a resolution might be about who is rewarded with the 2 ETH allocated to the off-chain application.

> In some other frameworks, these two concepts can be implicitly grouped together in such a way that the resolution might be _a part of the state itself_. From a conceptual point of view, we think it is important to separate these two concepts. However, from an engineering point of view it can be more efficient to group the two together in a single state object. To be specific, if the resolution of an off-chain application is a agnostic to blockchain state (i.e., `pure`) operation on the state of the application, then it is safe to group the two together. However, if the resolution has a dependancy on an external contract or the block number (i.e., a `view` function) then the resolution _must_ be separately resolved.

## Challenges

A challenge that is put on-chain must result from a failure of some state channel users to follow the protocol. In most cases, it represents a failure of responsiveness.

### Data Structure

In the `AppRegistry`, a challenge is represented by the following data structure:

```solidity
struct AppChallenge {
    AppStatus status;
    address latestSubmitter;
    bytes32 appStateHash;
    uint256 disputeCounter;
    uint256 disputeNonce;
    uint256 finalizesAt;
    uint256 nonce;
}
```

Where `AppStatus` is one of `ON`, `OFF`, or `DISPUTE`.

Here is a description of why each field exists in this data structure:

- **`status`**: A challenge exists in one of four logical states.
  - `ON`: Has never been opened (the "null" challenge and default for all off-chain apps)
  - `DISPUTE`: Open and its timeout parameter is in the future (can be responded to)
  - `DISPUTE`: Was opened and the timeout expired (the challenge was finalized)
  - `OFF`: Was finalized explicitly

![statechannel statuses](img/statechannel-statuses.svg)

Thus, this parameter simply records which state the challenge is in.

- **`finalizesAt`**: This is the block number at which a challenge is considered to be finalized if there is no reponse from anyone that is able to respond to the challenge.

- **`latestSubmitter`**: This is a record of _who_ submitted the last challenge. This is useful to ensure that if a [provably malicious](#provably-malicious-challenges) challenge was submitted, the malicious party can be punished.

- **`appStateHash`**: This is the hash of the latest state of the application. We only need to store the hash of the latest state in the event of a challenge because it is possible to accept the full state as calldata, hash it in the EVM, and then compare this to the hash and keep the full state available in calldata to be used for computation.

- **`nonce`**: This is the nonce (i.e., the monotonically increasing version number of the state) at which the `appStateHash` is versioned for a particular challenge.

- **`disputeNonce`**: It is allowed for a challenge to be responded to by issuing a new challenge. This idea is isomorphic to the familar state channels concept of "continuing the game on-chain". In this event, you want to keep track of the number of times a challenge has been "re-issued" as a new sense of versioning. We cannot simply increment the `nonce` field for reasons that are described in the section below: [on-chain progressions of off-chain state](#on-chain-progressions-of-off-chain-state).

- **`disputeCounter`**: A challenge _can_ be unanimously cancelled by all parties. In this scenario the `disputeNonce` goes back to 0. However, the `disputeCounter` is a permanent marker of how many times a challenge has been issued and re-issued on-chain. Parties can pre-agree that if this counter ever reaches an excessively high number, to simply resolve the application at some pre-determined resolution. This is simply a special mechanism to resolve applications in cases of excessive griefing by one counterparty. For more information, I recommend reading the [economic risks](https://github.com/counterfactual/paper/blob/master/main.tex#L343) section of the [Counterfactual paper](https://l4.ventures/papers/statechannels.pdf).

Since the contract that Counterfactual relies on for managing challenges is a singleton and is responsible for challnges that can occur in multiple different state channels simultaneously, it implements a mapping from what is called an `AppIdentity` to the challenge data structure described above.

The `AppIdentity` looks as follows:

```solidity
struct AppIdentity {
    address owner;
    address[] signingKeys;
    address appDefinitionAddress;
    bytes32 termsHash;
    uint256 defaultTimeout;
}
```

Here is a description of why each field exists in this data structure:

- **`owner`**: As has already been mentioned, the on-chain state deposit holder is a multisignature wallet with an `execTransaction` function on it. This field records the address of that multisig. It is used to treat any function call where `msg.sender == owner` as having achived unanimous consent.

- **`signingKeys`**: In addition to using `owner` to authorize a function call (whereby the signature verification is done inside the multisignature wallet contract), it is also possible to pass in signatures directly into the `AppRegistry` itself. In these cases, this field is used to validate signatures against to consider a function call as "authorized".

- **`appDefinitionAddress`**: This is the address ofthe app definition contract.

- **`termsHash`**: An application must adhere to some terms which describe what the _resolution_ of the application (should it ever be challenged on-chain) would need to adhere to. The danger that requires this strict adherence is that _any developer_ can write a `resolve` function for an application and this resolution will be executed in the scope of a `DELEGATECALL` on the multisignature wallet. Therefore, this property acts as a commitment by all parties to adhere to some `Terms` (which `termHash` is the hash of) to be verified against.

- **`defaultTimeout`**: Should the application that this data structure is describing ever be put on-chain, this property describes how long the timeout period would be if that challenge ever gets responded to on-chain. In the case of a challenge _initially_ being put on chain, the timeout period is a required parameter regardless, so this field is not used in that case.

### Initiating a Challenge

**Counterparty is unresponsive**. In the event that one user becomes unresponsive in the state channel application, it is always possible to simply submit the latest state of the application to the `AppRegistry` contract. This requires submitting an `AppIdentity` object, the hash of the latest state, its corresponding nonce, a timeout parameter, and the signatures required for those three data (or, alternatively, a transaction where `msg.sender` is `owner` in the `AppIdentity`). This initiates a challenge and places an `AppChallenge` object in the storage of the contract assuming all of the information provided is adequate.

**Counterparty is unresponsive _and_ a valid action exists**. In the case that an application adheres to the `AppDefinition` interface and provides valid `applyAction` and `getTurnTaker` functions, an action can additionally be taken when initiating a challenge. A function call to the `AppRegistry` with the latest state parameters exactly as in the case above but with an additional parameter for an encoded action and the requisite signatures by the valid turn taker can be made. In this case, a challenge is added the same as above but the state is progressed one step forward.

### Responding to a Challenge

**Cancelling the challenge**. In the simplest case, you and your counterparty can always sign a piece of data that declares "we would both like to cancel this challenge and resume off-chain". In this case, simply provide the contract with this evidence and the challenge can be deleted and ignored.

**Progressing the challenge on-chain**. If the counterparty that initiated the challenge is not willing to continue the application off-chain, but their challenge is indeed a valid one (perhaps you were offline temporarily), then you can progress the application on-chain if there exists an implementation for `applyAction` and `getTurnTaker`. In this case, much like is the case when initiating a challenge, you simply provide an encoded action and requisite signatures to re-issue the challenge but in the opposite direction.

**Handling a malicious challenge**. If the counterparty submitted stale state that is [provably malicious](#provably-malicious-challenges), then the contract supports claiming this by submitting a provably newer state that convicts them and rewards the honest party (i.e., you in this case).

## Resolutions

After a challenge has been finalized, the `AppRegistry` can now be used to arrive at a resolution. In the Counterfactual protocols, it is the _resolution_ of an application that is important in executing the disribution of blockchain state fairly for any given off-chain application.

The resolution is defined in the framework as a `Transaction` structure. Note that this object is currently under consideration for a refactoring to be slightly more generalized (i.e., removing `assetType` and `token` to be specific), but as of today in the codebase it is represented by:

```solidity
struct Transaction {
    uint8 assetType;
    address token;
    address[] to;
    uint256[] value;
    bytes[] data;
}
```

### Setting a Resolution

**After a challenge is finalized**. If a challenge has been finalized by the timeout expiring, then a function call can be made to the `AppRegistry` that then initiates a call to the `resolve` function of the corresponding `AppDefinition` to the challenge. The `resolve` method will return a `Transfer.Transaction` struct and that is then stored inside the contract permanently as the resolution of the application.

**In the same transaction as finalizing a challenge.** A minor efficiency can be added here, but has not yet been implemented, which is that if the challenge can finalized unilaterally (either in initiation or in refutation) then it is possible to instantly set the resolution. There is an [issue tracking this on GitHub](https://github.com/counterfactual/monorepo/issues/1311).

## FAQ

### On-chain Progressions of Off-chain State
It is possible that an application may have a challenge initiated on-chain and then have some state updated correctly off-chain. This would likely only occur in the case of a software error, but nonetheless it is possible. In the case of a state machine progression then there is a uniquely non-fault-attributable scenario that can occur:

- Honest party A initiates a challenge on-chain with B after B is unresponsive at nonce `k`
- B comes back online and tries to update the state of the application by signing a unilateral action (thereby incrementing the nonce to `k + 1`) and sending it to A
- B _also_ goes to chain and makes an on-chain challenge progression with a _different_ action, thereby incrementing the `disputeNonce` to `1`

A is now in a bizarre spot where he can _either_ respond to the challenge on-chain again (making the `disputeNonce` equal to `2`) or he could sign the state with nonce `k + 1`. In the latter case, the newly doubly-signed (`k + 1`)-versioned state would be able to be submitted on-chain and **overwrite** whatever state was on-chain with `disputeNonce` at `1`.

### Provably Malicious Challenges
A challenge for an `n`-party off-chain application is considered to be provably malicious if the `nonce` of the challenge was `k` and someone was able to respond with a state signed by the `latestSubmitter` where the `nonce` of _that challenge response_ was at least `k + 2`.

The reason why the same version of the above scenario with `nonce` equal to `k + 1` is not considered malicious is that the following situation might occur by an honest party:

- Honest party A signs state with nonce `k` and send it to B. Then, B countersigns and sends to A
- Honest party A signs state with nonce `k + 1` and send it to B, Then, B is unresponsive

In this situation, honest party A holds a signed copy of state with nonce `k` signed by B and can initiate a challenge on the blockchain. However, it is possible that B did in fact receive the signed state with nonce `k + 1` and can then respond to the challenge with this. Therefore, we must require that a state put on chain have at least `k + 2` to be considered an attempt at a stale state attack.
