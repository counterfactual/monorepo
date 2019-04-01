# Install Virtual App Protocol

This is the Install Virtual App Protocol.

## Roles

Three users run the protocol. They are designated as `initiating`, `responding`, and `intermediary`. The first two parties are the users wishing to interact together in a virtual app, who do not necessarily have a ledger channel between them. It is required that `initiating` and `intermediary` have a ledger channel together, and that `responding` and `intermediary` have a ledger channel together.

## The `InstallVirtualAppParams` type

|            Field             |      type      |                      description                      |
| ---------------------------- | -------------- | ----------------------------------------------------- |
| `initiatingXpub`             | `xpub`         | xpub of `initiating`                                  |
| `respondingXpub`             | `xpub`         | xpub of `responding`                                  |
| `intermediaryXpub`           | `xpub`         | xpub of `intermediary`                                |
| `defaultTimeout`             | `uint256`      |                                                       |
| `appInterface`               | `AppInterface` |                                                       |
| `initialState`               | `JSON`         | Encoded initial app state                             |
| `initiatingBalanceDecrement` | `uint256`      | `initiating`'s deposit into the installed application |
| `respondingBalanceDecrement` | `uint256`      | `responding`'s deposit into the installed application |
| `expiry`                     | `uint256`      | Not implemented in machine yet                        |

## Derived fields

These fields are not included in `InstallVirtualAppParams` but are computed from existing information known to a user.

|       Field        |    type     |                                 description                                  |
| ------------------ | ----------- | ---------------------------------------------------------------------------- |
| `multisig1Address` | `address`   | State deposit holder for the channel between `initiating` and `intermediary` |
| `multisig2Address` | `address`   | State deposit holder for the channel between `intermediary` and `responding` |
| `signingKeys`      | `address[]` | See below                                                                    |

`{initiating,responding,intermediary}`, together with the target app sequence number, are used to derive the app-specific signing keys. `signingKeys[0]` is the intermediary signing key, while `signingKeys[1:2]` are the signing keys used by `initiating` and `responding`, sorted lexicographically by public key.

## Commitments

### leftETHVirtualAppAgreement

A commitment to call `ETHVirtualAppAgreement::delegateTarget` with an `Agreement` argument with the following fields

|       Field       |     type     |                   description                   |
| ----------------- | ------------ | ----------------------------------------------- |
| `registry`        | `address`    | From network context                            |
| `terms`           | `Terms`      | See below                                       |
| `expiry`          | `address`    | `expiry`                                        |
| `appIdentityHash` | `bytes32`    | Hash of appIdentity of target virtual app       |
| `capitalProvided` | `uint256`    | `aliceBalanceDecrement` + `bobBalanceDecrement` |
| `beneficiaries`   | `address[2]` | `[initiatingAddress, intermediaryAddress]`      |

### rightETHVirtualAppAgreement

A commitment to call `ETHVirtualAppAgreement::delegateTarget`

|       Field       |     type     |                   description                   |
| ----------------- | ------------ | ----------------------------------------------- |
| `registry`        | `address`    | From network context                            |
| `terms`           | `Terms`      | See below                                       |
| `expiry`          | `address`    | `expiry`                                        |
| `appIdentityHash` | `bytes32`    | Hash of appIdentity of target virtual app       |
| `capitalProvided` | `uint256`    | `aliceBalanceDecrement` + `bobBalanceDecrement` |
| `beneficiaries`   | `address[2]` | `[intermediaryAddress, respondingAddress]`      |

#### `terms`:

|    Field    |   type    | description  |
| ----------- | --------- | ------------ |
| `assetType` | `uint8`   | `0`          |
| `token`     | `address` | `address(0)` |
| `limit`     | `uint256` | `0`          |

`limit` is explicitly ignored by the contract, while `assetType, token == 0, 0` means ETH.

### targetVirtualAppSetState

The protocol produces a commitment to call `virtualAppSetState` with the initial state. Note that `intermediary` produces a "type 2" signature while the others produce a "type 1" signature. This ensures that the intermediary's signature can be reused for calling `virtualAppSetState` with other app state hash values, i.e., that the intermediary does not need to be part of the update-virtual-app protocol.

```typescript
d1 = keccak256(
  ["bytes1", "bytes32", "bytes32", "uint256",
  [
    0x19,
    keccak256(identity),
    0,
    TIMEOUT
  ]
);
```

```typescript
d2 = keccak256(
  ["bytes1", "bytes32", "uint256", "uint256", "bytes1"],
  [
    0x19,
    keccak256(identity),
    65536,
    TIMEOUT,
    byte(0x01)
);
```

The signatures `s5` and `s7` are the signatures of `initiating` and `responding` respectively on `d1` while the signature `s6` is the signature of `intermediary` on `d2`.

## Messages

```eval_rst
.. mermaid:: diagrams/install-virtual-app-exchange.mmd
```

### M1

|     Field     |           Type            |       Description       |
| ------------- | ------------------------- | ----------------------- |
| `protocol`    | `string`                  | `"install-virtual-app"` |
| `multisig`    | `address`                 | `multisig1Address`      |
| `params`      | `InstallVirtualAppParams` |                         |
| `fromAddress` | `address`                 | `initiatingAddress`     |
| `toAddress`   | `address`                 | `intermediaryAddress`   |
| `seq`         | `number`                  | `1`                     |
| `signature1`  | `signature`               | The S1 signature        |
| `signature2`  | `signature`               | The S5 signature        |

### M2

|     Field     |          Description          |
| ------------- | ----------------------------- |
| `protocol`    | `"install-virtual-app"`       |
| `multisig`    | `multisig2Address`            |
| `params`      | `InstallVirtualAppParams`     |
| `fromAddress` | `intermediaryAddress`         |
| `toAddress`   | `respondingAddress`           |
| `seq`         | `2`                           |
| `signature1`  | The S5 signature (forwarded). |
| `signature2`  | The S3 signature              |

### M3

|     Field     |       Description       |
| ------------- | ----------------------- |
| `protocol`    | `"install-virtual-app"` |
| `multisig`    | `multisig2Address`      |
| `fromAddress` | `respondingAddress`     |
| `toAddress`   | `intermediaryAddress`   |
| `seq`         | `3`                     |
| `signature1`  | The S4 signature.       |
| `signature2`  | The S7 signature.       |
### M4

|     Field     |       Description       |
| ------------- | ----------------------- |
| `protocol`    | `"install-virtual-app"` |
| `multisig`    | `multisig2Address`      |
| `fromAddress` | `intermediaryAddress`   |
| `toAddress`   | `respondingAddress`     |
| `seq`         | `4`                     |
| `signature1`  | The S6 signature.       |

### M5

|     Field     |       Description       |
| ------------- | ----------------------- |
| `protocol`    | `"install-virtual-app"` |
| `multisig`    | `multisig1Address`      |
| `fromAddress` | `intermediaryAddress`   |
| `toAddress`   | `initiatingAddress`     |
| `seq`         | `5`                     |
| `signature1`  | The S6 signature.       |
| `signature2`  | The S2 signature.       |
| `signature3`  | The S7 signature.       |

### Summary

| Signature |         Commitment          | Signed By |
| --------- | --------------------------- | --------- |
| s1        | leftETHVirtualAppAgreement  | A         |
| s2        | leftETHVirtualAppAgreement  | I         |
| s3        | rightETHVirtualAppAgreement | I         |
| s4        | rightETHVirtualAppAgreement | B         |
| s5        | targetVirtualAppSetState    | A         |
| s6        | targetVirtualAppSetState    | I         |
| s7        | targetVirtualAppSetState    | B         |

| Message | Signatures |
| ------- | ---------- |
| m1      | s1, s5     |
| m2      | s5, s3     |
| m3      | s4, s7     |
| m4      | s6         |
| m5      | s6, s2, s7 |
