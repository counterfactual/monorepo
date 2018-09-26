## Install Protocol

(For ease of explanation, assume the multisig is now magically owning 20 ETH and that the Free Balance has recorded a balance of 10, 10 for Alice and Bob. We will explain how depositing is implemented by using the `Install` and `Uninstall` protocols at the end.)

Running the install protocol to play a game of Tic-Tac-Toe where Alice and Bob both bet 1 ETH transitions the counterfactual state to

![install](../images/install.png)

Notice how the funds move out of the free balance and into the tic-tac-toe application.

### Commitment

- updates the free balance state, decrementing both parties by the amount they contribute to the application install
- sets the nonce registry entry to 1, ensuring the "condition" in the Conditional Transfer is true
- executes the conditional transfer via delegatecall, withdrawing the funds from the multisig and distributing them according to the state of the application which the conditional transfer points to.

**Handshake:**

|A          |B            |
|-          |-            |
|`Install`  |             |
|           |`InstallAck` |

**Message:**

```typescript
Terms = {
  assetType: number,
  limit: number,
  token: address
}
CfAppInterface = {
  address: address,
  applyAction: bytes4,
  resolve: bytes4,
  getTurnTaken: bytes4,
  isStateTerminal: bytes4,
  abiEncoding: string
}
PeerBalance = {
  address: address,
  balance: uint256
}
InstallData = {
  peer1: PeerBalance, 
  peer2: PeerBalance,
  keyA: address,       // app-specific ephemeral key
  keyB: address,
  terms: Terms,
  app: CfAppInterface, 
  timeout: number,
}
Install = {
  protocol: 0x02,
  multisig: address,
  data: InstallData,
  fromAddress: address,
  toAddress: address,
  seq: 0,
  signature: signature,
}
InstallAck = {
  protocol: 0x02,
  multisig: address,
  data: InstallData,
  fromAddress: address,
  toAddress: address,
  seq: 1,
  signature: signature,
}

Install.fromAddress === InstallAck.toAddress;
Install.toAddress === InstallAck.fromAddress;
InstallData.peer1.address < InstallData.peer2.address;
```

### Main Files

- `install-proposer.ts`
- `cf-op-install.ts`