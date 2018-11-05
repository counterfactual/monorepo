# Update Protocol

![](./build/setstate-protocol-state.png)

Once an application has been installed into the state channel, the multisignature wallet has transferred control over the installed amount from the free balance to the application's `resolve` function, a mapping from application state to funds distribution. For example, in the case of Tic-Tac-Toe, a possible payout function is: if X wins, Alice gets 2 ETH, else if O wins Bob gets 2 ETH, else send 1 ETH to Alice and Bob.

As the underlying state of the application changes, the result of the payout function changes. It is the job of the Update Protocol to mutate this state, independently of the rest of the counterfactual structure.

Using our Tic-Tac-Toe example, if Alice decides to place an X on the board, Alice would run the Update Protocol, transitioning our state to what is represented by the figure above. Notice how both the board changes and the _local_ nonce for the app is bumped from 0 to 1. To play out the game, we can continuously run the update protocol, making one move at a time.

## Messages

![](./build/setstate-protocol-exchange.png)

For the below messages, the digest that is signed is represented as the following:

```typescript
keccak256(
  ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
  [
    0x19, // Required for every sig digest (ERC 191)
    [ALICE_ADDRESS, BOB_ADDRESS], // Must be in sorted order
    app.localNonce, // A number higher than previously signed nonces
    timeout, // A timeout specific to this latest signed update
    appStateHash // The hash of the application state being set
  ]
);
```

### The **`SetState`** Message

| Field         | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `protocol`    | `3`                                                                         |
| `cfAddress`   | The counterfactual address / unique identifier of the off-chain application |
| `data`        | An object containing the `bytes32` representation of the `appStateHash`     |
| `fromAddress` | The address of Alice                                                        |
| `toAddress`   | The address of Bob                                                          |
| `seq`         | `0`                                                                         |
| `signature`   | Alice's signed commitment digest                                            |

> TODO: Use the ABIEncoderV2 encoded application state instead of the `appStateHash`; without it the receiving client can't decode the message to determine whether or not to sign

> TODO: Add a field for the ABIEncoderV2 encoded action

### The **`SetStateAck`** Message

| Field         | Description                                                                 |
| ------------- | --------------------------------------------------------------------------- |
| `protocol`    | `3`                                                                         |
| `cfAddress`   | The counterfactual address / unique identifier of the off-chain application |
| `data`        | `""`                                                                        |
| `fromAddress` | The address of Alice                                                        |
| `toAddress`   | The address of Bob                                                          |
| `seq`         | `1`                                                                         |
| `signature`   | Bob's signed commitment digest                                              |

## Commitments

**Commitment for `SetState` and `SetStateAck`**:

The commitment can be visually represented like:

![](./build/setstate-protocol-commitment.png)

This transaction uses the global, on-chain Registry contract to translate the counterfactual address of the application into an on-chain address, and subsequently invoke the `setState` function with the signatures exchanged during the protocol.
