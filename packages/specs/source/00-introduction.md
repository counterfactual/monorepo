# Introduction

Counterfactual is a state channels based protocol for off-chain blockchain-based applications.

Counterfactual implements a general purpose protocol for using state channels, an important technique for reducing fees for blockchain users. State channels allow users to interact with each other without paying blockchain transaction fees and with instant finality. Channelization is the only technique that securely realises the latter property.

A state channel framework consists of contracts as well as protocols that users run. In the protocols, participants exchange cryptographically signed messages through an arbitrary communication channel. These messages are pre-signed transactions that distribute the blockchain state or perform other tasks necessary to the channel's correct resolution. Next, participants deposit blockchain state into an n-of-n multisignature wallet referenced by the transactions. New cryptographically signed state updates having a special relationship to the original commitments can now be used to change the state and/or assets controlled by the multisignature wallet.

Through a challenge-response mechanism, on-chain contracts implement methods for participants to ensure that the latest signed valid state update that pertains to their commitment can be submitted to the blockchain, guaranteeing correct resolution of the state for all users adhering to the protocol.

Counterfactual uses a generic system of Ethereum smart contracts to support arbitrary conditional transactions of blockchain state owned by a multisignature wallet. For a full explanation of the contracts layer, please read the [contracts](./01-contracts.md) subsection.

## Framework Design Goals

The Counterfactual framework is still a work in progress.  Its current design (and future roadmap) are driven primarily by the following criteria:

### Minimized on-chain footprint

We don’t want to put anything on the chain that doesn’t need to be. We aim to make a generic multisignature wallet the only necessary on-chain object for a state channel.

### Maximized privacy

We want to achieve a level of privacy where state channel operations are indistinguishable from other common types of on-chain activities. Using a state channel should not reveal any information about the applications that are being used, the state being used within them, or even the fact that a state channel is being used at all. As a first step towards preserving this property, we assume that the on-chain component is a generic multisignature wallet which looks the same as any other multisignature wallet on Ethereum. In the future we expect that stricter levels of privacy will be enabled by various zero knowledge constructions, and that those will fit best when applied in similarly general, abstract ways that fit neatly with this approach.

### Ease-of-use

We want channels that can be easily incorporated into new applications without the requirement that their developers also be state channel experts. To provide at least one such simple method for developers to utilize within our framework, we have created an abstraction for state-machine-based channel applications, or "Apps". This class of "App" consists of simple stateless contracts which define a state machine, including valid transitions and turn-taking logic. Although state-machine-based "Apps" are an intentionally restricted subset of state channel functionality, they nonetheless enable developers to deploy a wide range of channelized applications without butting up against the often complex and subtle [limitations](#limitations) of state channel design. As the protocol develops further more complex functionality will continue be added, allowing easy utilization of increasingly advanced techniques by developers making use of the Counterfactual framework.

### Parallel operations

We want to support multiple parallel operations inside of a single channel that do not interfere with each other. We have designed these simple state-machine-based "Apps" to maintain control of the state assigned to them in a fashion completely independent of each other. Typical operations like installing new applications, uninstalling old applications, and updating applications are all fully parallelized operations within the protocol.

### Upgradeable

We want to support deploying or upgrading channel designs without requiring the user to make a single on-chain operation. There are multiple techniques which are specifically anticipated in the current design. For the purposes of _trustless_ off-chain upgradability, we are able to support counterfactually instantiated smart contracts as applications. To upgrade a contract trustlessly, state channel participants can simply agree off-chain to a new version of bytecode for their application. At the cost of certain additional trust assumptions, state channel participants could also use an application that is defined using [ZeppelinOS's upgradeable contracts](https://docs.zeppelinos.org/docs/building.html) or a similar method.

### Standardized

We want to establish clear standards for how all of these generalized state channels will fit together into a global, multi-blockchain network where any user can easily connect to any other. To achieve this goal, we work closely with great researchers from [Celer](https://celer.network), [Magmo](https://magmo.com), [Ethereum Research](http://eth.sg) and several others. We hope to amplify these efforts to work towards blockchain standards for off-chain channelized applications more broadly.

## Protocol Design Goals

### One round trip communication

The protocol has been optimized to require the minimum number of round trips possible for secure updates to the off-chain state. This has effectively led to the use of multiple transactions being bundled inside a single transaction using the [`MultiSend`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/MultiSend.sol) contract built by Gnosis.

The goal of having one round trip for each protocol execution is purely an optimization and it is the case that "uncompressed" variations do exist that are equally as secure but more costly in communication overhead. This is [currently up for discussion](https://github.com/counterfactual/specs/issues/13).

### Constant sized communication

The number of messages an message sizes for an operation are independent of

- Total number of active off-chain applications
- Total number of inactive off-chain applications
- Total number of sequential state updates to an application

That is to say, the design aims for **parallelizability** in general, ensuring that historical use of the protocol does not impact the size of messages being transmitted on future use of the protocol.

### O(1) response to stale state

It is possible to arrive at a state where any placement of stale state on chain can be responded to with a single transaction of constant size, in particular, independent of number of active or historical apps. This goal is to ensure that any kind of inevitable griefing vectors that are impossible to fully disqualify off-chain are resolvable with the minimum amount of cost to the person being griefed on-chain.

## Protocol Structure

A protocol consists of the following components:

- **Exchange**. The protocol exchange is the series of messages exchanged between all parties in the state channel, as well as dependencies between messages.

- **Message**. A message is the set of information that must be exchanged by the parties to recreate and validate the commitment signatures and associated transactions that those signatures enable. Each protocol may in general contain multiple message types.

- **Commitments**. A protocol produces one or more commitments. Both the signatures and the data contained within the commitments must be stored.

> Note: Messages are represented as JSON-encoded objects; the transport layer should be able to reliably send and receive such messages.

> Note: Some data required for signature verification is _not_ present in these messages but is deterministically generated by each party. For example, [`setNonce`](https://github.com/counterfactual/monorepo/blob/master/packages/contracts/contracts/NonceRegistry.sol#L42) requires a salt, which is a monotonically increasing counter on the number of applications in a channel.

### Commitment Structure

- **Signature**. The resultant data generated by computing a cryptographic signature over some hash representing the transaction to be executed.

- **Data**. Supplementary data that that allows any party in the protocol to reconstruct the hash and thus verify the signature.

- **Transaction Digest**. The transaction digest is the hash that is signed by each party, enabling the protocol's transaction to be executed on-chain. The calldata, if present, is used to generate the digest.

- **Transaction**. The transaction is the `(to, val, data, op)` tuple that a given protocol allows one to broadcast on-chain. These transactions enforce commitments created from the calldata and signature digests, manifesting the off-chain counterfactual state into the on-chain reality.
