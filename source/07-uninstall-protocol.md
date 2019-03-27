# Uninstall Protocol

```eval_rst
.. mermaid:: diagrams/uninstall-protocol-state.mmd
```

The lifecycle of an application completes when it reaches some type of end or "terminal" state, at which point both parties know the finalized distribution of funds in the application-specific state channel.

In the case of a regular application specific state channel, both parties might broadcast the application on chain, wait the timeout period, and then broadcast the execution of the Conditional Transfer, thereby paying out the funds on chain. In the generalized state channel context however, the post-application protocol is to transfer the funds controlled by the application back to the Free Balance application off chain, so that they could be reused for other off-chain applications.

Using our Tic-Tac-Toe example, imagine Alice made the final winning move, declaring X the winner. If Alice runs the Uninstall Protocol, then the Counterfactual state transitions to what is shown above.

## Messages

```eval_rst
.. mermaid:: diagrams/uninstall-protocol-exchange.mmd
```

### The **`Uninstall`** Message

|     Field     |                                    Description                                    |
| ------------- | --------------------------------------------------------------------------------- |
| `protocol`    | `"uninstall"`                                                                     |
| `cfAddress`   | The counterfactual address / unique identifier of the off-chain application       |
| `data`        | A object representing the updated balances of the of the free balance application |
| `fromAddress` | The address of Alice                                                              |
| `toAddress`   | The address of Bob                                                                |
| `seq`         | `1`                                                                               |
| `signature`   | Alice's signed commitment digest                                                  |

### The **`UninstallAck`** Message

|     Field     |                                 Description                                 |
| ------------- | --------------------------------------------------------------------------- |
| `protocol`    | `"uninstall"`                                                               |
| `cfAddress`   | The counterfactual address / unique identifier of the off-chain application |
| `data`        | `""`                                                                        |
| `fromAddress` | The address of Alice                                                        |
| `toAddress`   | The address of Bob                                                          |
| `seq`         | `2`                                                                         |
| `signature`   | Bob's signed commitment digest                                              |

## Commitments

**Commitment for `Uninstall` and `UninstallAck`**:

There are two key operations required for a successful uninstall.

- Set a new state on the Free Balance. The resolution function defined in the application must be run to compute an update to the Free Balance that is based on the outcome of the application.
- Set a new nonce on the Nonce Registry. As a result, the Conditional Transfer pointing at the original application will be invalidated and the application will be considered deleted.

Specifically, the Conditional Transfer commitment created by the Install Protocol checks that the dependency nonce does not equal 1. _If the nonce is ever 1_, then the conditional transfer will fail. Hence setting the nonce to 1 invalidates the conditional transfer, which is desired behaviour.

```eval_rst
.. mermaid:: diagrams/uninstall-protocol-commitment.mmd
```
