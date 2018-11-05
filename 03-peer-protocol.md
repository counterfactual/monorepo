# Peer Protocol for Channel Management

To exemplify the protocols as we define them, we will assume there exists a multisignature wallet shared between two parties, Alice and Bob. This is the only required re-usable on-chain component (with the exception of supporting libraries) to execute each of the protocols below.

# Type Definitions and Global Variables

**Global Variables**:

| Variable Name        | Type      | Description                                                              |
| -------------------- | --------- | -------------------------------------------------------------------------|
| **`REGISTRY`**       | `address` | The deployed on-chain address of the `Registry` singleton contract       |
| **`NONCE_REGISTRY`** | `address` | The deployed on-chain address of the `NonceRegistry` singleton contract  |

**Type: `Terms`**

| Field       | Type      | Description                                             |
| ----------- | --------- | ------------------------------------------------------- |
| `assetType` | `uint8`   | A value in the enum of `{ETH, ERC20, Other}`            |
| `limit`     | `uint256` | The exact total budget that an application can spend    |
| `token`     | `address` | If `assetType` is `ERC20` then the address of the token |

**Type: `CfAppInterface`**

| Field             | Type      | Description                                                                                          |
| ----------------- | --------- | ---------------------------------------------------------------------------------------------------- |
| `address`         | `address` | The on-chain address of the `AppDefinition` contract implementing the application logic              |
| `applyAction`     | `bytes4`  | The sighash of the `applyAction` method on the `AppDefinition` contract                              |
| `resolve`         | `bytes4`  | The sighash of the `resolve` method on the `AppDefinition` contract                                  |
| `isStateTerminal` | `bytes4`  | The sighash of the `isStateTerminal` method on the `AppDefinition` contract                          |
| `getTurnTaken`    | `bytes4`  | The sighash of the `getTurnTaken` method on the `AppDefinition` contract                             |
| `token`           | `address` | If `assetType` is `ERC20` then the address of the token                                              |
| `abiEncoding`     | `bytes4`  | The ABIEncoderV2 representation of the application's state encoding (e.g., `"tuple(address,uint8)"`) |

> TODO: The name `getTurnTaken` needs to be standardized

**Type: `PeerBalance`**

| Field     | Type      | Description                                               |
| --------- | --------- | --------------------------------------------------------- |
| `address` | `address` | The address of a party that deposited into an application |
| `balance` | `uint256` | The amount deposited into the application                 |

> TODO: This type needs to be abstracted to mirror the `Terms` type more closely such that arbitrary assets can be better represented
