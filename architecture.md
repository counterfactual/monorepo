## Architecture

Counterfactual implements a general purpose protocol for using state channels, an important technique for reducing fees for blockchain users. Within their scope of applicability, they allow users to transact with each other without paying blockchain transaction fees and with instant finality, and are the only technique that securely realises the latter property.

With this approach, participants begin by depositing blockchain state into the possession of an n-of-n multisignature wallet. Then, they proceed to exchange cryptographically signed messages through an arbitrary communication channel. These messages are either pre-signed transactions to distribute the blockchain state or state updates relevant relevant to those commitments that change the distribution. The protocol that defines what kinds of messages are exchanged to ensure secure off-chain state updates is described in depth in the [protocol](/protocol) section.

Through a challenge-response mechanism, on-chain contracts implement a method for participants to ensure the latest signed valid state update that pertains to their commitment can be submitted to the blockchain to guarantee fair adjudication of the state.

Counterfactual uses a generic system of Ethereum smart contracts to support artbitrary conditional transactions of blockchain state owned by a multisignature wallet. For a full explainer of the contracts layer, please read the [contracts](/contracts) subsection.
