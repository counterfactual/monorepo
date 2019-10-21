# Channel Networks

The framework currently contains basic support for channel networks via "virtual apps". In this design, an app instance between that set of parties can have some state deposit assigned indirectly to it, without the set of parties having a direct channel containing them. A commitment is made to `ConditionalTransactionDelegateTarget.sol:executeEffectOfInterpretedAppOutcome` with the `appIdentityHash` being that of the virtual app but the interpreter is unique for each side of the network. The outcome is interpreted to send one side the value the virtual app's outcome dictates they should receive and the intermediary the other side's value. For example, in an A-I-B virtual app, where I is intermediating an app instance between A and B, then there is a commitment made in the A-I channel that interprets the outcome of the A-B virtual app such that A would receive A's result and I receives B's result.

## FAQ

**Why is the agreement thing specialized to `TwoPartyFixedOutcome` and `ETH`?**

This is similar to why we have different interpreters - the app definition writer does not explicitly choose which assets their app supports, but simply implements an outcome type.

**Are all asset types supported by this design?**

No - only fungible asset types are. We do not write an agreement that implements support for ERC721 NFTs, for example. Supporting NFTs in channel networks generally require assumptions/agreements about pricing the NFTs, how much the price can change over time, etc.

**Does `expiry` mean the app instance has an expiry time?**

Yes - this is a limitation of our current design. It exists so that the intermediary's capital is not locked up forever. The other way to guarantee this, and the general strategy to remove the expiry-time restriction, is to give the intermediary the ability to make an on-chain transaction to create a new direct channel, allowing them to recover their locked-up capital. However this is more complicated and is still in the "spec design" phase.

**Can new app instances be installed without the intermediary's involvement?**

No.

**What topologies are supported?**

Currently, a single intermediary connected in two direct channels to two different parties, who fund a virtual app with themselves as the signers.

The current roadmap for supporting more complex topologies is to remove the expiry-time restriction and at the same time reuse the existing interpreters infrastructure. This will also allow app instances to be installed without the intermediary's involvement.
