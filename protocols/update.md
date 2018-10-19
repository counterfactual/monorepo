# Update Protocol

Once an application has been installed into the GSC, the multisig has transferred control over the installed amount from the free balance to the application's payout function, a mapping from application state to funds distribution. For example, in the case of Tic-Tac-Toe, a possible payout function is: if X wins, Alice gets 2 ETH, else if O wins Bob gets 2 ETH, else send 1 ETH to Alice and Bob.

And so as the underlying state of the application changes, the result of the payout function changes. It is the job of the Update Protocol to mutate this state, independently of the rest of the counterfactual structure.

Using our Tic-Tac-Toe example, if Alice decides to place an X on the board, Alice would run the Update Protocol, transitioning our state to

![update](../img/update.png)

Notice how both the board changes and the *local* nonce for the app is bumped from 0 to 1. To play out the game, we can continuously run the update protocol, making one move at a time.

## Handshake

| A        | B           |
| -------- | ----------- |
| `Update` |             |
|          | `UpdateAck` |

## Messsage

```typescript
Update = {
  protocol: 4,
  cfAddress: bytes32
  data: {
    appStateHash: bytes32
  },
  fromAddress: address,
  toAddress: address,
  seq: 0,
  signature: signature,
}
UpdateAck = {
  protocol: 4,
  cfAddress: bytes32
  data: None,
  fromAddress: address,
  toAddress: address,
  seq: 1,
  signature: signature,
}
```

## Main Files

- `cf-op-setstate.ts`

## Digest

```typescript
KECCAK256(
    ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
	[
		0x19,                           // required for every sig digest (ERC 191)
		[ALICE_ADDRESS, BOB_ADDRESS],   // must be in sorted order
		app.localNonce,
		timeout,                        // determined on installation
		appStateHash                    // given in UpdateData
	]
)
```

## Commitment

### Parameters

- `app.cfAddress`
- `app.stateHash`
- `app.localNonce`
- `timeout`

### Transaction

```typescript
call(
    to = REGISTRY_ADDRESS,
    val = 0,
    data = encode(
        "proxyCall(address,bytes32,bytes)",
        [
            REGISTRY_ADDRESS,
            app.cfAddress,
            encode(
                "setState(bytes32,uint256,uint256,bytes)",
                [
                    app.stateHash,
                    app.localNonce,
                    timeout,
                    signatures
                ]
            )
        ]
    )
)
```

This transaction uses the global, on-chain Registry contract to translate the counterfactual address of the application into an on-chain address, and subsequently invoke the `setState` function with the signatures exchanged during the protocol.
