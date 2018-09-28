# Uninstall Protocol

The lifecycle of an application completes when it reaches some type of end or "final" state, at which point both parties know the finalized distribution of funds in the application-specific state channel.

Now, both parties could simply broadcast the application on chain, wait the dispute period, and then broadcast the execution of the Conditional Transfer, thereby paying out the funds on chain. A better solution, however, is to transfer the funds controlled by the application back to the Free Balance contract off chain, so that they could be reused for other applications.

Using our Tic-Tac-Toe example, imagine Alice made the final winning move, declaring X the winner. If Alice runs the Uninstall Protocol, then the Counterfactual state transitions to

![uninstall](../images/uninstall.png)

Notice the two operations here:

- set a new state on the Free Balance. Alice's balance in the Free Balance object was incremented by 2 ETH, repurposing the funds once owned by the Tic-Tac-Toe application.
- set a new nonce on the Nonce Registry. As a result, the Conditional Transfer pointing at Tic-Tac-Toe was invalidated, because we changed its associated entry in the NonceRegistry to 2.

Specifically, when we exchange commitments on the Conditional Transfer in the Install Protocol, we are exchanging signatures allowing us to execute a Conditional Transfer if and only if the nonce equals 1. *If the Nonce is ever not 1*, then the conditional transfer will fail, as desired in the Uninstall Protocol.

## Handshake

| A           | B              |
| ----------- | -------------- |
| `Uninstall` |                |
|             | `UninstallAck` |

## Message

```typescript
Uninstall = {
  protocol: 4,
  cfAddress: bytes32,
  data: {
    peerAmounts: [ PeerBalance, PeerBalance ]
  },
  fromAddress: address,
  toAddress: address,
  seq: 0,
  signature: signature,
}
AckUninstall = {
  protocol: 4,
  cfAddress: bytes32,
  fromAddress: address,
  toAddress: address,
  seq: 1,
  signature: signature,
}
```

## Transaction

```typescript
delegatecall(
    to = MULTISEND_ADDRESS,
    val = 0,
    data = encodeArgs(/* set FreeBalance state */
        ("uint256", "address", "uint256", "bytes"),
        [
            1,
            REGISTRY_ADDRESS,
            0,
            encode(
                "proxyCall(address,bytes32,bytes)"
                [
                    REGISTRY_ADDRESS,
                    freeBalance.CfAddress,
                    encode(
                        "setState(bytes32,uint256,uint256,bytes)",
                        [
                            appStateHash,
                            freeBalance.localNonce,
                            freeBalance.timeout,
                            0x00
                        ]
                    )
                ]
            ),
        ]
    ) + encodeArgs(/* set dependency nonce */
        ("uint256", "address", "uint256", "bytes"),
        [
            0,
            NONCE_REGISTRY,
            0,
            encode(
                "setNonce(uint256,byets32,uint256)",
                [
                    0, salt, 2
                ]
            ),
        ]
    )
)
```