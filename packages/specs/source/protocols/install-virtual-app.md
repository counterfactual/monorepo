# Install Virtual App Protocol

The **Install Virtual App Protocol** can be followed to allocate some funds inside of a `StateChannel` to a new `AppInstance` where the counterparty on the `AppInstance` does not have an existing on-chain multisignature wallet with funds inside of it. Instead, funds are "guaranteed" to the `AppInstance` via agreements on both ends of two `StateChannels` with an intermediary.

One way of thinking about this protocol is that it is essentially comprised of two Install Protocol executions. The first installation is between the initiator and the intermediary and the second between the intermediary and the responder. The installation produces `ConditionalTransaction` commitments which are signed but the distinction is that the `appIdentityHash` that is being pointed to is actually one where the `participants` are the initiator and the responder in both cases, and never the intermediary. Of course, then, the _interpreter_ parameters that are used then become unique each installation and interpret the outcome of the "virtual app" differently. The purpose of the setup is to ensure that no matter the outcome, the intermediary will receive the same amount of funds so that they take on no risk.

## Commitments

As mentioned above, there are `ConditionalTransaction` commitments that get signed which we label as a "VirtualAppAgreement". This agreement checks the outcome of the `AppInstance` being installed virtually and distributes the funds to the intermediary and the counterparty accordingly.

There is one additional commitment that is unique to this protocol, however, which is the `VirtualAppSetState` commitment. Since the `participants` of the `AppInstance` _include_ the intermediary, we need a way of removing the requirement that every state must be signed by them. So, the `VirtualAppSetState` is exactly that; it commits on behalf of the intermediary that all state signed up until some `expiryVersionNumber` do not require the intermediaries signature to be valid.

### VirtualAppSetState

There are two digests for this commitment. The first is for the initiator and responder parties to sign:

```typescript
keccak256(
  abi.encodePacked(
    byte(0x19),
    identityHash, // The identity hash for the virtual app
    versionNumber, // The intial version number (will be 0)
    timeout, // The timeout for this state (will be the default)
    appStateHash // The hash of the initial state
  )
);
```

This is identical to any normal signed digest for a state update as you would see in the Update Protocol.

The second is for the intermediary to sign:

```typescript
keccak256(
  abi.encodePacked(
    byte(0x19),
    identityHash, // The identity hash for the virtual app
    req.versionNumberExpiry, // Block up until which intermediary signature is not required
    req.timeout, // The timeout for this state (will be default)
    byte(0x01)
  )
);
```

## The `InstallVirtualAppParams` type

| Field                        | type                       | description                                           |
| ---------------------------- | -------------------------- | ----------------------------------------------------- |
| `initiatorXpub`             | `xpub`                     | xpub of `initiator`                                  |
| `responderXpub`             | `xpub`                     | xpub of `responder`                                  |
| `intermediaryXpub`           | `xpub`                     | xpub of `intermediary`                                |
| `defaultTimeout`             | `uint256`                  | Timeout in case of challenge                          |
| `appInterface`               | `AppInterface`             | The interface of the virtual app being installed      |
| `initialState`               | `SolidityABIEncoderV2Type` | The initial state of the virtual app                  |
| `initiatorBalanceDecrement` | `uint256`                  | `initiator`'s deposit into the installed application |
| `responderBalanceDecrement` | `uint256`                  | `responder`'s deposit into the installed application |

## Messages

```eval_rst
.. mermaid:: ../diagrams/install-virtual-app-exchange.mmd
```

### M1 - Initiator signs AB VirtualAppAgreement

| Field        | Type                      | Description             |
| ------------ | ------------------------- | ----------------------- |
| `protocol`   | `string`                  | `"install-virtual-app"` |
| `params`     | `InstallVirtualAppParams` |                         |
| `toXpub`     | `address`                 | `intermediaryXpub`   |
| `seq`        | `number`                  | `1`                     |
| `signature`  | `signature`               | Initiating signature on   AB VirtualAppAgreement      |

### M2 - Intermediary signs BC VirtualAppAgreement

| Field        | Description                   |
| ------------ | ----------------------------- |
| `protocol`   | `"install-virtual-app"`       |
| `params`     | `InstallVirtualAppParams`     |
| `toXpub`     | `responderXpub`           |
| `seq`        | `2`                           |
| `signature`  | Intermediary signature on BC VirtualAppAgreement|


### M3 - Responding signs BC VirtualAppAgreement and BC FreeBalanceActivation

| Field        | Description             |
| ------------ | ----------------------- |
| `protocol`   | `"install-virtual-app"` |
| `toXpub`     | `intermediaryXpub`   |
| `seq`        | `-1`                    |
| `signature`  | Responding signature on BC VirtualAppAgreement|
| `signature2`  | Responding signature on BC FreeBalanceActivation|

### M4 - Intermediary signs AB VirtualAppAgreement and AB FreeBalanceActivation

| Field       | Description             |
| ----------- | ----------------------- |
| `protocol`  | `"install-virtual-app"` |
| `toXpub`    | `initiatorXpub`     |
| `seq`       | `-1`                    |
| `signature`  | Intermediary signature on AB VirtualAppAgreement|
| `signature2`  | Intermediary signature on AB FreeBalanceActivation|

### M5 - Initiating signs AB FreeBalanceActivation and ABC VirtualAppSetState

| Field        | Description             |
| ------------ | ----------------------- |
| `protocol`   | `"install-virtual-app"` |
| `toXpub`     | `intermediaryXpub`        |
| `seq`        | `-1`                    |
| `signature`  | Initiating signature on AB FreeBalanceActivation|
| `signature2`  | Initiating signature on ABC VirtualAppSetState|


### M6 - Intermediary signs BC FreeBalanceActivation and ABC VirtualAppSetState

Note that in this message the intermediary is *forwarding* the initiator's signature on the ABC VirtualAppSetState commitment.

| Field        | Description             |
| ------------ | ----------------------- |
| `protocol`   | `"install-virtual-app"` |
| `toXpub`     | `responderXpub`        |
| `seq`        | `-1`                    |
| `signature`  | Intermediary signature on BC FreeBalanceActivation|
| `signature2`  | Intermediary signature on ABC VirtualAppSetState |
| `signature3`  | Initiating signature on ABC VirtualAppSetState |


### M7 - Responding signs ABC VirtualAppSetState

| Field        | Description             |
| ------------ | ----------------------- |
| `protocol`   | `"install-virtual-app"` |
| `toXpub`     | `intermediaryXpub`        |
| `seq`        | `-1`                    |
| `signature`  | Responding signature on ABC VirtualAppSetState|


### M8 - Intermediary sends initiator ABC VirtualAppSetState

Note that in this message the intermediary is *forwarding* the responder's signature on the ABC VirtualAppSetState commitment.

| Field        | Description             |
| ------------ | ----------------------- |
| `protocol`   | `"install-virtual-app"` |
| `toXpub`     | `initiatorXpub`        |
| `seq`        | `-1`                    |
| `signature`  | Intermediary signature on ABC VirtualAppSetState|
| `signature2`  | Responding signature on ABC VirtualAppSetState|
