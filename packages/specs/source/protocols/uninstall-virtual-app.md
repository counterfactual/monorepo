# Uninstall Virtual App Protocol

This is the Uninstall Virtual App Protocol.

## Roles

Three users run the protocol. They are designated as `initiator`, `responder`, and `intermediary`. It is required that `initiator` and `responder` have run the `install-virtual-app` protocol previously with the same `intermediary`; however it is allowed to swap the roles of `initiator` and `responder`.

## The `UninstallVirtualAppParams` type

|            Field            |   type    |                        description                         |
| --------------------------- | --------- | ---------------------------------------------------------- |
| `initiatorXpub`             | `xpub`    | xpub of `initiator`                                        |
| `responderXpub`             | `xpub`    | xpub of `responder`                                        |
| `intermediaryXpub`          | `xpub`    | xpub of `intermediary`                                     |
| `targetAppIdentityHash`     | `bytes32` | app identity hash of app instance to uninstall             |
| `initiatorBalanceIncrement` | `uint256` | `initiator`'s resulting share of the installed application |
| `responderBalanceIncrement` | `uint256` | `responder`'s resulting share of the installed application |

At the end of this protocol the commitments `{left,right}ETHVirtualAppAgreement` defined in the `install-virtual-app` protocol are cancelled, and the free balances are updated.

## Commitments

### lockCommitment

The protocol produces a commitment to call `setState` with the final state of the `TimeLockedPassThrough` AppInstance in the `defaultOutcome` parameter and the `switchesOutcomeAt` value at `0`. This specific commitment is what guarantees that the "final outcome" of the virtual app is what is set inside of the `defaultOutcome` field; thereby "locking" it at this outcome.

### uninstallLeft

A commitment to cancel the `leftETHVirtualAppAgreement` commitment produced by `install-virtual-app` and simultaneously update the free balance in the `initiator`-`intermediary` free balance.

### uninstallRight

A commitment to cancel the `rightETHVirtualAppAgreement` commitment produced by `install-virtual-app` and simultaneously update the free balance in the `intermediary`-`responder` free balance.

## Signatures

| Signature |   Commitment   |   Signed By    |
| --------- | -------------- | -------------- |
| s1        | lockCommitment | `initiator`    |
| s2        | lockCommitment | `intermediary` |
| s3        | lockCommitment | `responder`    |
| s4        | uninstallLeft  | `initiator`    |
| s5        | uninstallLeft  | `intermediary` |
| s6        | uninstallright | `intermediary` |
| s7        | uninstallright | `responder`    |

## Messages

```eval_rst
.. mermaid:: ../diagrams/uninstall-virtual-app-exchange.mmd
```

| Message | Signatures |
| ------- | ---------- |
| m1      | s1         |
| m2      | s1, s2     |
| m3      | s3         |
| m4      | s3, s2     |
| m5      | s4         |
| m6      | s5         |
| m7      | s6         |
| m8      | s7         |

### M1

|         Field          |            Type             |        Description        |
| ---------------------- | --------------------------- | ------------------------- |
| `protocol`             | `string`                    | `"uninstall-virtual-app"` |
| `params`               | `UninstallVirtualAppParams` |                           |
| `toXpub`               | `address`                   | `intermediaryAddress`     |
| `seq`                  | `number`                    | `1`                       |
| `customData.signature` | `signature`                 | The S1 signature          |

### M2

|          Field          |            Type             |        Description        |
| ----------------------- | --------------------------- | ------------------------- |
| `protocol`              | `string`                    | `"uninstall-virtual-app"` |
| `params`                | `UninstallVirtualAppParams` |                           |
| `toXpub`                | `address`                   | `responderAddress`        |
| `seq`                   | `number`                    | `2`                       |
| `customData.signature`  | `signature`                 | The S1 signature          |
| `customData.signature2` | `signature`                 | The S2 signature          |

### M3

|         Field          |            Type             |        Description        |
| ---------------------- | --------------------------- | ------------------------- |
| `protocol`             | `string`                    | `"uninstall-virtual-app"` |
| `params`               | `UninstallVirtualAppParams` |                           |
| `toXpub`               | `address`                   | `intermediaryAddress`     |
| `seq`                  | `number`                    | `-1`                      |
| `customData.signature` | `signature`                 | The S3 signature          |

### M4

|          Field          |            Type             |        Description        |
| ----------------------- | --------------------------- | ------------------------- |
| `protocol`              | `string`                    | `"uninstall-virtual-app"` |
| `params`                | `UninstallVirtualAppParams` |                           |
| `toXpub`                | `address`                   | `initiatorAddress`        |
| `seq`                   | `number`                    | `-1`                      |
| `customData.signature`  | `signature`                 | The S3 signature          |
| `customData.signature2` | `signature`                 | The S2 signature          |

### M5

|         Field          |            Type             |        Description        |
| ---------------------- | --------------------------- | ------------------------- |
| `protocol`             | `string`                    | `"uninstall-virtual-app"` |
| `params`               | `UninstallVirtualAppParams` |                           |
| `toXpub`               | `address`                   | `intermediaryAddress`     |
| `seq`                  | `number`                    | `-1`                      |
| `customData.signature` | `signature`                 | The S4 signature          |

### M6

|         Field          |            Type             |        Description        |
| ---------------------- | --------------------------- | ------------------------- |
| `protocol`             | `string`                    | `"uninstall-virtual-app"` |
| `params`               | `UninstallVirtualAppParams` |                           |
| `toXpub`               | `address`                   | `initiatorAddress`        |
| `seq`                  | `number`                    | `-1`                      |
| `customData.signature` | `signature`                 | The S5 signature          |

### M7

|         Field          |            Type             |        Description        |
| ---------------------- | --------------------------- | ------------------------- |
| `protocol`             | `string`                    | `"uninstall-virtual-app"` |
| `params`               | `UninstallVirtualAppParams` |                           |
| `toXpub`               | `address`                   | `responderAddress`        |
| `seq`                  | `number`                    | `-1`                      |
| `customData.signature` | `signature`                 | The S6 signature          |

### M8

|         Field          |            Type             |        Description        |
| ---------------------- | --------------------------- | ------------------------- |
| `protocol`             | `string`                    | `"uninstall-virtual-app"` |
| `params`               | `UninstallVirtualAppParams` |                           |
| `toXpub`               | `address`                   | `intermediaryAddress`     |
| `seq`                  | `number`                    | `-1`                      |
| `customData.signature` | `signature`                 | The S7 signature          |
