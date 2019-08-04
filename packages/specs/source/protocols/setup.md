# Setup Protocol

```eval_rst
.. mermaid:: ../diagrams/setup-protocol-state.mmd
```

## Messages

After authentication and initializing a connection, channel establishment may begin. All state channels must run the Setup Protocol before any other protocol. As the name suggests, its purpose is to setup the counterfactual state such that later protocols can be executed correctly.

Specifically, the Setup Protocol exchanges a commitment allowing a particular off-chain application to withdraw funds from the multisignature wallet. We call this application instance the Free Balance application, representating the available funds for any new application to be installed into the state channel. The app definition is called IdentityApp.

```eval_rst
.. mermaid:: ../diagrams/setup-protocol-exchange.mmd
```

Unlike other protocols, there is no extra message data for the Setup Protocol because the commitment digests are fully determined by the addresses of the participants.

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

**Commitment for `Setup` and `SetupAck`**:

The commitment can be visually represented like:

```eval_rst
.. mermaid:: ../diagrams/setup-commitment.mmd
```
