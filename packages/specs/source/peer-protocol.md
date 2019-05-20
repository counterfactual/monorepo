# Protocols

A protocol is defined as the set of instructions executed and messages exchanged between a set of parties to achieve an outcome (e.g., installing a new state channel application). Instructions executed include producing digital signatures, reading persistent state to disk, etc.

Counterfactual writes client software that speak the same Counterfactual protocol, specified in the following page.

Many protocols are specialized to two-party and specified as such. We plan to extend them to n-party channels in the future.

## Primitive Types

|   Type    |          Description          |                                                      Sample                                                       |
| --------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `address` | Ethereum address              | `0x3bfc20f0b9afcace800d73d2191166ff16540258`                                                                      |
| `xpub`    | HD wallet extended public key | `xpub6GhhMtkVjoPi5DKtqapKzMzrzdGjo1EPc7Ka6KdeoXYdCrTBH1Hu1wKysm8boWSy8VeTKVJi6gQJ2qJ4YG2ZhvFDcUUgMJrFCJWN1PGtBry` |
| `uint8`   | 8 bit unsigned integer        |                                                                                                                   |
| `uint256` | 256 bit unsigned integer      |                                                                                                                   |
| `bytes32` | 32 bytes                      |                                                                                                                   |

## Singleton Contracts

|    Variable Name     |   Type    |                               Description                               |
| -------------------- | --------- | ----------------------------------------------------------------------- |
| **`REGISTRY`**       | `address` | The deployed on-chain address of the `Registry` singleton contract      |
| **`NONCE_REGISTRY`** | `address` | The deployed on-chain address of the `NonceRegistry` singleton contract |

## JSON

This type specifies a modification of JSON that disallows the following primitive types: `true`, `false`, `null`. Note that when represented in javascript, large numbers which fint into `uint256` must be represented as either `BigNumber`s or as serialized `BigNumber`s (e.g., `{ _hex: '0x01'}`).

**Type: `CfAppInterface`**

|      Field       |        Type        |                                             Description                                              |
| ---------------- | ------------------ | ---------------------------------------------------------------------------------------------------- |
| `address`        | `address`          | The on-chain address of the `AppDefinition` contract implementing the application logic              |
| `stateEncoding`  | `string`           | The ABIEncoderV2 representation of the application's state encoding (e.g., `"tuple(address,uint8)"`) |
| `actionEncoding` | `Optional<string>` | The ABIEncoderV2 representation of the application's action encoding, if it exists                   |
