## Uninstall Protocol

The lifecycle of an application completes when it reaches some type of end or "final" state, at which point both parties know the finalized distribution of funds in the application-specific state channel.

Now, both parties could simply broadcast the application on chain, wait the dispute period, and then broadcast the execution of the Conditional Transfer, thereby paying out the funds on chain. A better solution, however, is to transfer the funds controlled by the application back to the Free Balance contract off chain, so that they could be reused for other applications.

Using our Tic-Tac-Toe example, imagine Alice made the final winning move, declaring X the winner. If Alice runs the Uninstall Protocol, then the Counterfactual state transitions to

![uninstall](../images/uninstall.png)

Notice the two operations here:

- set a new state on the Free Balance. Alice's balance in the Free Balance object was incremented by 2 ETH, repurposing the funds once owned by the Tic-Tac-Toe application.
- set a new nonce on the Nonce Registry. As a result, the Conditional Transfer pointing at Tic-Tac-Toe was invalidated, because we changed its associated entry in the NonceRegistry to 2.

Specifically, when we exchange commitments on the Conditional Transfer in the Install Protocol, we are exchanging signatures allowing us to execute a Conditional Transfer if and only if the nonce equals 1. *If the Nonce is ever not 1*, then the conditional transfer will fail, as desired in the Uninstall Protocol.

### Handshake

| A           | B              |
| ----------- | -------------- |
| `Uninstall` |                |
|             | `UninstallAck` |

### Message

```typescript
Uninstall = {
  protocol: 4,
  cfAddress: bytes32,
  data: {
    peerAmounts: [ PeerBalance, PeerBalance ]
  },
  from: address,
  to: address,
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

**Calldata:**

```typescript
// first build the individual transactions

// set state on the free balance, incrementing the balances according to the app payout
let free_balance_update = {
	op: 0, // Call
	to: FREE_BALANCE_ADDRESS,
	val: 0,
	data: // todo after we update free balance to not use a conditional transfer
}
// set the nonce registry entry to 2, invalidating any conditional transfer on the app
let set_nonce_registry = {
	op: 0, // Call
	to: FREE_BALANCE_ADDRESS,
	val: 0,
	data: new ethers.Interface([Abi.setNonce]).functions.setNonce.encode([
			APP_NUMBER_ID, // k if this application is the kth installed application
			2
		]);
}
let transactions = [free_balance_update, set_nonce_registry];

// now construct the multisend
let calldata = // use the transactions to construct calldata (see the install protocol)
```

**Signature digest:**

```typescript
ethers.utils.solidityKeccak256(
  ["bytes1", "address", "address", "uint256", "bytes", "uint256"],
  [
    "0x19",
	this.multisig,
	MULTISEND_ADDRESS, // to (global contract)
	0, // val
	calldata, // data
	0 // op (call)
  ]
);
```

As usual this signature allows us to invoke <a href="https://github.com/counterfactual/contracts/blob/develop/contracts/MinimumViableMultisig.sol">execTransaction</a> on our multisig with the given calldata, which triggers our multisend transaction from above.

**Transaction:**

```typescript
function transaction() {
    let to = MULTISIG_ADDRESS;
    let val = 0;
    let data = new ethers.Interface([
        "execTransaction(address,uint256,bytes,uint256,bytes)"
    ]).functions.execTransaction.encode([
        MULTISEND_ADDRESS, // to
        0, // val
        calldata,
        0, // call
        Signature.toBytes(signatures)
    ]);
    let op = delegatecall;
	return {
    	to, val, data, op
	}
}
```
