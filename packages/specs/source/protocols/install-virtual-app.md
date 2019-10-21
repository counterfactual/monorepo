# Install Virtual App Protocol

The **Install Virtual App Protocol** can be followed to allocate some funds inside of a `StateChannel` to a new `AppInstance` where the counterparty on the `AppInstance` does not have an existing on-chain multisignature wallet with funds inside of it. Instead, funds are "guaranteed" to the `AppInstance` via agreements on both ends of two `StateChannels` with an intermediary.

One way of thinking about this protocol is that it is essentially comprised of two Install Protocol executions. The first installation is between the initiator and the intermediary and the second between the intermediary and the responder. The installation produces `ConditionalTransaction` commitments which are signed but the distinction is that the `appIdentityHash` that is being pointed to is actually one where the `participants` are the initiator and the responder in both cases, and never the intermediary. Of course, then, the _interpreter_ parameters that are used then become unique each installation and interpret the outcome of the "virtual app" differently. The purpose of the setup is to ensure that no matter the outcome, the intermediary will receive the same amount of funds so that they take on no risk.

## Commitments

As mentioned above, there are `ConditionalTransaction` commitments that get signed which we label as a "VirtualAppAgreement". This agreement checks the outcome of the `AppInstance` being installed virtually and distributes the funds to the intermediary and the counterparty accordingly.

There is one additional commitment that is unique to this protocol, however, which is the `VirtualAppSetState` commitment. Since the `participants` of the `AppInstance` _include_ the intermediary, we need a way of removing the requirement that every state must be signed by them. So, the `VirtualAppSetState` is exactly that; it commits on behalf of the intermediary that all state signed up until some `expiryVersionNumber` do not require the intermediary's signature to be valid.

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

|            Field            |        type         |                     description                      |
| --------------------------- | ------------------- | ---------------------------------------------------- |
| `initiatorXpub`             | `xpub`              | xpub of `initiator`                                  |
| `responderXpub`             | `xpub`              | xpub of `responder`                                  |
| `intermediaryXpub`          | `xpub`              | xpub of `intermediary`                               |
| `defaultTimeout`            | `uint256`           | Timeout in case of challenge                         |
| `appInterface`              | `AppInterface`      | The interface of the virtual app being installed     |
| `initialState`              | `SolidityValueType` | The initial state of the virtual app                 |
| `initiatorBalanceDecrement` | `uint256`           | `initiator`'s deposit into the installed application |
| `responderBalanceDecrement` | `uint256`           | `responder`'s deposit into the installed application |

## Messages

```eval_rst
.. mermaid:: ../diagrams/install-virtual-app-exchange.mmd
```

### M1 - Initiator signs AB VirtualAppAgreement

|         Field          |           Type            |                  Description                   |
| ---------------------- | ------------------------- | ---------------------------------------------- |
| `protocol`             | `string`                  | `"install-virtual-app"`                        |
| `params`               | `InstallVirtualAppParams` |                                                |
| `toXpub`               | `address`                 | `intermediaryXpub`                             |
| `seq`                  | `number`                  | `1`                                            |
| `customData.signature` | `signature`               | Initiating signature on AB VirtualAppAgreement |

### M2 - Intermediary signs IB VirtualAppAgreement

|         Field          |                   Description                    |
| ---------------------- | ------------------------------------------------ |
| `protocol`             | `"install-virtual-app"`                          |
| `params`               | `InstallVirtualAppParams`                        |
| `toXpub`               | `responderXpub`                                  |
| `seq`                  | `2`                                              |
| `customData.signature` | Intermediary signature on IB VirtualAppAgreement |


### M3 - Responding signs IB VirtualAppAgreement and IB FreeBalanceActivation

|          Field          |                   Description                    |
| ----------------------- | ------------------------------------------------ |
| `protocol`              | `"install-virtual-app"`                          |
| `toXpub`                | `intermediaryXpub`                               |
| `seq`                   | `-1`                                             |
| `customData.signature`  | Responding signature on IB VirtualAppAgreement   |
| `customData.signature2` | Responding signature on IB FreeBalanceActivation |

### M4 - Intermediary signs AB VirtualAppAgreement and AI FreeBalanceActivation

|          Field          |                    Description                     |
| ----------------------- | -------------------------------------------------- |
| `protocol`              | `"install-virtual-app"`                            |
| `toXpub`                | `initiatorXpub`                                    |
| `seq`                   | `-1`                                               |
| `customData.signature`  | Intermediary signature on AB VirtualAppAgreement   |
| `customData.signature2` | Intermediary signature on AI FreeBalanceActivation |

### M5 - Initiating signs AI FreeBalanceActivation and AB VirtualApp SetState

|          Field          |                        Description                         |
| ----------------------- | ---------------------------------------------------------- |
| `protocol`              | `"install-virtual-app"`                                    |
| `toXpub`                | `intermediaryXpub`                                         |
| `seq`                   | `-1`                                                       |
| `customData.signature`  | Initiating signature on AI FreeBalanceActivation           |
| `customData.signature2` | Initiating signature on AIB TimeLockedPassThrough SetState |
| `customData.signature3` | Initiating signature on AB VirtualApp SetState             |


### M6 - Intermediary signs IB FreeBalanceActivation and AB VirtualApp SetState

Note that in this message the intermediary is *forwarding* the initiator's signature on the AB VirtualApp SetState commitment.

|          Field          |                        Description                         |
| ----------------------- | ---------------------------------------------------------- |
| `protocol`              | `"install-virtual-app"`                                    |
| `toXpub`                | `responderXpub`                                            |
| `seq`                   | `-1`                                                       |
| `customData.signature`  | Intermediary signature on IB FreeBalanceActivation         |
| `customData.signature2` | Intermediary signature on AB VirtualApp SetState           |
| `customData.signature3` | Initiating signature on AIB TimeLockedPassThrough SetState |
| `customData.signature4` | Initiating signature on AB VirtualApp SetState             |


### M7 - Responding signs AB VirtualApp SetState

|          Field          |                        Description                         |
| ----------------------- | ---------------------------------------------------------- |
| `protocol`              | `"install-virtual-app"`                                    |
| `toXpub`                | `intermediaryXpub`                                         |
| `seq`                   | `-1`                                                       |
| `customData.signature`  | Responding signature on AIB TimeLockedPassThrough SetState |
| `customData.signature2` | Responding signature on AB VirtualApp SetState             |



### M8 - Intermediary sends initiator AB VirtualApp SetState

Note that in this message the intermediary is *forwarding* the responder's signature on the AB VirtualApp SetState commitment.

|          Field          |                        Description                         |
| ----------------------- | ---------------------------------------------------------- |
| `protocol`              | `"install-virtual-app"`                                    |
| `toXpub`                | `initiatorXpub`                                            |
| `seq`                   | `-1`                                                       |
| `customData.signature`  | Intermediary signature on AB VirtualApp SetState           |
| `customData.signature2` | Responding signature on AB VirtualApp SetState             |
| `customData.signature3` | Responding signature on AIB TimeLockedPassThrough SetState |
