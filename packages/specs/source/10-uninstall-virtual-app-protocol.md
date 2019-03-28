# Uninstall Virtual App Protocol

This is the Uninstall Virtual App Protocol.

## Roles

Three users run the protocol. They are designated as `initiating`, `responding`, and `intermediary`. It is required that `initiating` and `responding` have run the `install-virtual-app` protocol previously with the same `intermediary`; however it is allowed to swap the roles of `initiating` and `responding`.

## The `UninstallVirtualAppParams` type


|            Field             |   type    |                         description                         |
| ---------------------------- | --------- | ----------------------------------------------------------- |
| `initiatingXpub`             | `xpub`    | xpub of `initiating`                                        |
| `respondingXpub`             | `xpub`    | xpub of `responding`                                        |
| `intermediaryXpub`           | `xpub`    | xpub of `intermediary`                                      |
| `targetAppIdentityHash`      | `bytes32` | app identity hash of app instance to uninstall              |
| `initiatingBalanceIncrement` | `uint256` | `initiating`'s resulting share of the installed application |
| `respondingBalanceIncrement` | `uint256` | `responding`'s resulting share of the installed application |

At the end of this protocol the commitments `{left,right}ETHVirtualAppAgreement` defined in the `install-virtual-app` protocol are cancelled, and the free balances are updated.

## Commitments

### lockCommitment

The protocol produces a commitment to call `virtualAppSetState` with the final state of the app and at a high app local nonce. The existence of this commitment and the high local nonce means that the `s6` signature (from `intermediary` on the `targetVirtualAppSetState` commitment) is no longer useful, and the changes to the app state cannot be made without the intemediary's signature.

### uninstallLeft

A commitment to cancel the `leftETHVirtualAppAgreement` commitment produced by `install-virtual-app` and simultaneously update the free balance in the `initiating`-`intermediary` free balance.

### uninstallRight

A commitment to cancel the `rightETHVirtualAppAgreement` commitment produced by `install-virtual-app` and simultaneously update the free balance in the `intermediary`-`responding` free balance.

## Signatures

| Signature |   Commitment   |   Signed By    |
| --------- | -------------- | -------------- |
| s1        | lockCommitment | `initiating`   |
| s2        | lockCommitment | `intermediary` |
| s3        | lockCommitment | `responding`   |
| s4        | uninstallLeft  | `initiating`   |
| s5        | uninstallLeft  | `intermediary` |
| s6        | uninstallright | `intermediary` |
| s7        | uninstallright | `responding`   |

## Messages

```eval_rst
.. mermaid:: diagrams/uninstall-virtual-app-exchange.mmd
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

|     Field     |            Type             |        Description        |
| ------------- | --------------------------- | ------------------------- |
| `protocol`    | `string`                    | `"uninstall-virtual-app"` |
| `multisig`    | `address`                   | `multisig1Address`        |
| `params`      | `UninstallVirtualAppParams` |                           |
| `fromAddress` | `address`                   | `initiatingAddress`       |
| `toAddress`   | `address`                   | `intermediaryAddress`     |
| `seq`         | `number`                    | `1`                       |
| `signature1`  | `signature`                 | The S1 signature          |

### M2

|     Field     |            Type             |        Description        |
| ------------- | --------------------------- | ------------------------- |
| `protocol`    | `string`                    | `"uninstall-virtual-app"` |
| `multisig`    | `address`                   | `multisig2Address`        |
| `params`      | `UninstallVirtualAppParams` |                           |
| `fromAddress` | `address`                   | `intermediaryAddress`     |
| `toAddress`   | `address`                   | `respondingAddress`       |
| `seq`         | `number`                    | `2`                       |
| `signature`   | `signature`                 | The S1 signature          |
| `signature2`  | `signature`                 | The S2 signature          |

### M3

|     Field     |            Type             |        Description        |
| ------------- | --------------------------- | ------------------------- |
| `protocol`    | `string`                    | `"uninstall-virtual-app"` |
| `multisig`    | `address`                   | `multisig2Address`        |
| `params`      | `UninstallVirtualAppParams` |                           |
| `fromAddress` | `address`                   | `respondingAddress`       |
| `toAddress`   | `address`                   | `intermediaryAddress`     |
| `seq`         | `number`                    | `-1`                      |
| `signature`   | `signature`                 | The S3 signature          |

### M4

|     Field     |            Type             |        Description        |
| ------------- | --------------------------- | ------------------------- |
| `protocol`    | `string`                    | `"uninstall-virtual-app"` |
| `multisig`    | `address`                   | `multisig1Address`        |
| `params`      | `UninstallVirtualAppParams` |                           |
| `fromAddress` | `address`                   | `intermediaryAddress`     |
| `toAddress`   | `address`                   | `initiatingAddress`       |
| `seq`         | `number`                    | `-1`                      |
| `signature`   | `signature`                 | The S3 signature          |
| `signature2`  | `signature`                 | The S2 signature          |

### M5

|     Field     |            Type             |        Description        |
| ------------- | --------------------------- | ------------------------- |
| `protocol`    | `string`                    | `"uninstall-virtual-app"` |
| `multisig`    | `address`                   | `multisig1Address`        |
| `params`      | `UninstallVirtualAppParams` |                           |
| `fromAddress` | `address`                   | `initiatingAddress`       |
| `toAddress`   | `address`                   | `intermediaryAddress`     |
| `seq`         | `number`                    | `-1`                      |
| `signature`   | `signature`                 | The S4 signature          |

### M6

|     Field     |            Type             |        Description        |
| ------------- | --------------------------- | ------------------------- |
| `protocol`    | `string`                    | `"uninstall-virtual-app"` |
| `multisig`    | `address`                   | `multisig1Address`        |
| `params`      | `UninstallVirtualAppParams` |                           |
| `fromAddress` | `address`                   | `intermediaryAddress`     |
| `toAddress`   | `address`                   | `initiatingAddress`       |
| `seq`         | `number`                    | `-1`                      |
| `signature`   | `signature`                 | The S5 signature          |

### M7

|     Field     |            Type             |        Description        |
| ------------- | --------------------------- | ------------------------- |
| `protocol`    | `string`                    | `"uninstall-virtual-app"` |
| `multisig`    | `address`                   | `multisig2Address`        |
| `params`      | `UninstallVirtualAppParams` |                           |
| `fromAddress` | `address`                   | `intermediaryAddress`     |
| `toAddress`   | `address`                   | `respondingAddress`       |
| `seq`         | `number`                    | `-1`                      |
| `signature`   | `signature`                 | The S6 signature          |

### M8

|     Field     |            Type             |        Description        |
| ------------- | --------------------------- | ------------------------- |
| `protocol`    | `string`                    | `"uninstall-virtual-app"` |
| `multisig`    | `address`                   | `multisig2Address`        |
| `params`      | `UninstallVirtualAppParams` |                           |
| `fromAddress` | `address`                   | `respondingAddress`       |
| `toAddress`   | `address`                   | `intermediaryAddress`     |
| `seq`         | `number`                    | `-1`                      |
| `signature`   | `signature`                 | The S7 signature          |

