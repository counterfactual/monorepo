# Channel Networks

The framework currently contains basic support for channel networks via "virtual apps". In this design, an app instance between that set of parties can have some state deposit assigned indirectly to it, without the set of parties having a direct channel containing them. Since the app instance is not directly funded, no commitment to `StateChannelTransaction.sol:executeEffectOfInterpretedAppOutcome` is made to that app instance. Instead, a number of commitments to `TwoPartyVirtualEthAsLump` are made in different direct channels to the same app instance (i.e., passing the same `appIdentityHash`). The commitment passes the following struct as a field.

```solidity
struct Agreement {
  ChallengeRegistry registry;
  UninstallKeyRegistry uninstallKeyRegistry;
  uint256 expiry;
  bytes32 appIdentityHash;
  uint256 capitalProvided;
  address payable[2] beneficiaries;
  bytes32 uninstallKey;
}
```

- **`registry`**: The `ChallengeRegistry` where the target app instance is stored
- **`uninstallKeyRegistry`**: The `UninstallKeyRegistry` by which this agreement can be cancelled
- **`expiry`**: The block height above which this agreement is valid
- **`appIdentityHash`**: Hash of the target app identity
- **`capitalProvided`**: Total amount of ETH the target app instance allocates
- **`beneficiaries`**: The two recipients of ETH, the numerical balance of which is decided by the target app instance's outcome
- **`uninstallKey`**: Passed to `nonceRegistry` to check if this commitment is cancelled

## FAQ

**Why is the agreement thing specialized to `TwoPartyFixedOutcome` and `ETH`?**

This is similar to why we have different interpreters - the app definition writer does not explicitly choose which assets their app supports, but simply implements an outcome type.

**Are all asset types supported by this design?**

No - only fungible asset types are. We do not write an agreement that implements support for ERC721 NFTs, for example. Supporting NFTs in channel networks generally require assumptions/agreements about pricing the NFTs, how much the price can change over time, etc.

**Does `expiry` mean the app instance has an expiry time?**

Yes - this is a limitation of our current design. It exists so that the intermediary's capital is not locked up forever. The other way to guarantee this, and the general strategy to remove the expiry-time restriction, is to give the intermediaries the ability to make an on-chain transaction to create a new direct channel, allowing them to recover their locked-up capital. However this is more complicated and is still in the "spec design" phase.

**Can new app instances be installed without the intermediary's involvement?**

No.

**What topologies are supported?**

Currently, a single intermediary connected in two direct channels to two different parties, who fund a virtual app with themselves as the signers.

The current roadmap for supporting more complex topologies is to remove the expiry-time restriction and at the same time reuse the existing interpreters infrastructure. This will also allow app instances to be installed without the intermediary's involvement.
