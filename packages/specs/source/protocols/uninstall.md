# Uninstall Protocol

```eval_rst
.. mermaid:: ../diagrams/uninstall-protocol-state.mmd
```

The lifecycle of an application completes when it reaches some type of end or "terminal" state, at which point both parties know the finalized distribution of funds in the application-specific state channel.

In the case of a regular application specific state channel, both parties might broadcast the application on chain, wait the timeout period, and then broadcast the execution of the Conditional Transfer, thereby paying out the funds on chain. In the generalized state channel context however, the post-application protocol is to transfer the funds controlled by the application back to the Free Balance application off chain, so that they could be reused for other off-chain applications.

Using our Tic-Tac-Toe example, imagine Alice made the final winning move, declaring X the winner. If Alice runs the Uninstall Protocol, then the Counterfactual state transitions to what is shown above.

## Messages

```eval_rst
.. mermaid:: ../diagrams/uninstall-protocol-exchange.mmd
```

### The **`Uninstall`** Message

|     Field     |                                    Description                                    |
| ------------- | --------------------------------------------------------------------------------- |
| `protocol`    | `"uninstall"`                                                                     |
| `fromAddress` | The address of `initiator`                                                        |
| `toAddress`   | The address of `responder`                                                        |
| `seq`         | `1`                                                                               |
| `signature`   | Alice's signed commitment digest                                                  |

### The **`UninstallAck`** Message

|       Field       |             Description              |
| ----------------- | ------------------------------------ |
| `protocol`        | `"uninstall"`                        |
| `appIdentityHash` | Identifies app instance to uninstall |
| `fromAddress`     | The address of `initiator`           |
| `toAddress`       | The address of `responder`           |
| `seq`             | `2`                                  |
| `signature`       | Bob's signed commitment digest       |

## Commitments

**Commitment for `Uninstall` and `UninstallAck`**:

There is one operation required for a successful uninstall.

- Set a new state on the Free Balance. The outcome function defined in the application must be run to compute an update to the Free Balance that is based on the outcome of the application.

Specifically, the Conditional Transfer commitment created by the Uninstall Protocol updates the free balance state with the app removed from the list of active apps and its outcome folded into the new state of the free balance.

```eval_rst
.. mermaid:: ../diagrams/uninstall-protocol-commitment.mmd
```
