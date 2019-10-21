# Take Action Protocol

This protocol is similar to the update protocol. However, instead of the `initiator` providing a new state, they provide an action that is used to compute the new state.

## Roles

Two users run the protocol. They are designated as `initiator` and `responder`.

## Messages

```eval_rst
.. mermaid:: ../diagrams/takeaction-protocol-exchange.mmd
```

**Type: `TakeActionParams`**

|       Field       |   Type    |                Description                |
| ----------------- | --------- | ----------------------------------------- |
| `appIdentityHash` | `bytes32` | Identifies app instance to take action on |
| `action`          | `JSON`    | New state to set to                       |

### The **`SetState`** Message

|     Field     |              Description               |
| ------------- | -------------------------------------- |
| `protocol`    | `"takeAction"`                         |
| `params`      | An `TakeActionParams` object           |
| `fromAddress` | The address of `initiator`             |
| `toAddress`   | The address of `responder`             |
| `seq`         | `1`                                    |
| `signature`   | `initiator`'s signed commitment digest |

### The **`SetStateAck`** Message

|     Field     |              Description               |
| ------------- | -------------------------------------- |
| `protocol`    | `"update"`                             |
| `fromAddress` | The address of `responder`             |
| `toAddress`   | The address of `initiator`             |
| `seq`         | `2`                                    |
| `signature`   | `responder`'s signed commitment digest |

## Commitments

The commitment produced is identical to the one produced by the update protocol.
