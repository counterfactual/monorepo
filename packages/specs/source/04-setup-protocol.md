# Setup Protocol

> NOTE: All of the protocols below specify a 2-party interaction but can be generalized to the multi-party case in the future.

```eval_rst
.. mermaid:: diagrams/setup-protocol-state.mmd
```

## Messages

After authentication and initializing a connection, channel establishment may begin. All state channels must run the Setup Protocol before any other protocol. As the name suggests, its purpose is to setup the counterfactual state such that later protocols can be executed correctly.

Specifically, the Setup Protocol exchanges a commitment allowing a particular off-chain application to withdraw funds from the multisignature wallet. We call this application instance the Free Balance application, representating the available funds for any new application to be installed into the state channel. The app definition is called ETHBucket.

```eval_rst
.. mermaid:: diagrams/setup-protocol-exchange.mmd
```

Unlike other protocols, there is no extra message data for the Setup Protocol because the commitment digests are fully determined by the addresses of the participants.

### The **`SetRootNonce`** Message

|     Field     |           Description            |
| ------------- | -------------------------------- |
| `protocol`    | `"setup"`                        |
| `fromAddress` | The address of Alice             |
| `toAddress`   | The address of Bob               |
| `seq`         | `1`                              |
| `signature`   | Alice's signed commitment digest |

### The **`SetRootNonceAck`** Message

|     Field     |          Description           |
| ------------- | ------------------------------ |
| `protocol`    | `"setup"`                      |
| `fromAddress` | The address of Alice           |
| `toAddress`   | The address of Bob             |
| `seq`         | `2`                            |
| `signature`   | Bob's signed commitment digest |

### The **`Setup`** Message

|     Field     |                         Description                         |
| ------------- | ----------------------------------------------------------- |
| `protocol`    | `"setup"`                                                   |
| `multisig`    | The address of the on-chain Alice-Bob multisignature wallet |
| `data`        | `""`                                                        |
| `fromAddress` | The address of Alice                                        |
| `toAddress`   | The address of Bob                                          |
| `seq`         | `3`                                                         |
| `signature`   | Alice's signed commitment digest                            |

### The **`SetupAck`** Message

|     Field     |                         Description                         |
| ------------- | ----------------------------------------------------------- |
| `protocol`    | `"setup"`                                                   |
| `multisig`    | The address of the on-chain Alice-Bob multisignature wallet |
| `data`        | `""`                                                        |
| `fromAddress` | The address of Alice                                        |
| `toAddress`   | The address of Bob                                          |
| `seq`         | `4`                                                         |
| `signature`   | Bob's signed commitment digest                              |

## Commitments

**Commitment for `SetRootNonce` and `SetRootNonceAck`**:

The commitments that these two messages rely on have the following parameters:

|       Parameter        |   Type    |                           Description                            |
| ---------------------- | --------- | ---------------------------------------------------------------- |
| **`rootNonceTimeout`** | `uint256` | Relative timeout in seconds after which the root nonce finalizes |
| **`rootNonceSalt`**    | `bytes32` | Arbitrary value to facilitate uniqueness of the root nonce       |

The commitment can be visually represented like:

```eval_rst
.. mermaid:: diagrams/set-root-nonce-commitment.mmd
```

**Commitment for `Setup` and `SetupAck`**:

The commitments that these two messages rely on have the following explicit parameters:

|     Parameter      |   Type    |                                                    Description                                                     |
| ------------------ | --------- | ------------------------------------------------------------------------------------------------------------------ |
| **`uninstallKey`** | `bytes32` | Arbitrary value that the installed free balance app's conditional transaction depends on inside the Nonce Registry |

Additionally, the following parameters are implicitly computed:

|         Parameter          |   Type    |                                                              Description                                                               |
| -------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **`terms`**                | `Terms`   | Set to the default value                                                                                                               |
| **`freeBalanceCfAddress`** | `bytes32` | Set to the computed value for a counterfactual address of a `PaymentApp` with the initial signing keys of both users and default terms |

The commitment can be visually represented like:

```eval_rst
.. mermaid:: diagrams/setup-commitment.mmd
```

> NOTE: The usage of `MultiSend` in this commitment is unnecessary and should be removed.
