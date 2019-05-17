# Peer Protocol for Channel Management

To exemplify the protocols as we define them, we will assume there exists a multisignature wallet shared between two parties, Alice and Bob. This is the only required re-usable on-chain component (with the exception of supporting libraries) to execute each of the protocols below.

## Primitive Types

|   Type    |          Description          |                                                      Sample                                                       |
| --------- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `address` | Ethereum address              | `0x3bfc20f0b9afcace800d73d2191166ff16540258`                                                                      |
| `xpub`    | HD wallet extended public key | `xpub6GhhMtkVjoPi5DKtqapKzMzrzdGjo1EPc7Ka6KdeoXYdCrTBH1Hu1wKysm8boWSy8VeTKVJi6gQJ2qJ4YG2ZhvFDcUUgMJrFCJWN1PGtBry` |
| `uint8`   | 8 bit unsigned integer        |                                                                                                                   |
| `uint256` | 256 bit unsigned integer      |                                                                                                                   |
| `bytes32` | 32 bytes                      |                                                                                                                   |

## Global Variables

|    Variable Name     |   Type    |                               Description                               |
| -------------------- | --------- | ----------------------------------------------------------------------- |
| **`REGISTRY`**       | `address` | The deployed on-chain address of the `Registry` singleton contract      |
| **`NONCE_REGISTRY`** | `address` | The deployed on-chain address of the `NonceRegistry` singleton contract |

## JSON

This type specifies a modification of JSON that disallows the following primitive types: `true`, `false`, `null`. Note that when represented in javascript, large numbers which fint into `uint256` must be represented as either `BigNumber`s or as serialized `BigNumber`s (e.g., `{ _hex: '0x01'}`).

**Type: `Terms`**

|    Field    |   Type    |                       Description                       |
| ----------- | --------- | ------------------------------------------------------- |
| `assetType` | `uint8`   | A value in the enum of `{ETH, ERC20, Other}`            |
| `limit`     | `uint256` | The exact total budget that an application can spend    |
| `token`     | `address` | If `assetType` is `ERC20` then the address of the token |

**Type: `CfAppInterface`**

|     Field     |   Type    |                                             Description                                              |
| ------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `address`     | `address` | The on-chain address of the `AppDefinition` contract implementing the application logic              |
| `token`       | `address` | If `assetType` is `ERC20` then the address of the token                                              |
| `abiEncoding` | `bytes4`  | The ABIEncoderV2 representation of the application's state encoding (e.g., `"tuple(address,uint8)"`) |

> TODO: The name `getTurnTaker` needs to be standardized
