# Install Protocol

Assume the multisig owns 20 ETH and that the Free Balance has recorded a balance of 10, 10 for Alice and Bob.

Running the install protocol to play a game of Tic-Tac-Toe where Alice and Bob both bet 1 ETH transitions the counterfactual state to

![install](../images/install.png)

The funds available in the free balance decrease and the funds committed to the tic-tac-toe application increase by the corresponding amount.

## Commitment

Let `c_1`, `c_2` be the amount that parties 1 and 2 wish to contribute towards the application. The commitment

- updates the free balance state to one where party 1's balance is reduced by `c_1` and party 2's balance is reduced by `c_2`.
- sets the nonce registry entry to 1.
- calls `executeAppConditionalTransfer` with a limit of `c_1 + c_2`.

## Handshake

|A          |B            |
|-          |-            |
|`Install`  |             |
|           |`InstallAck` |

## Message

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
  protocol: 4,
  multisig: address,
  data: InstallData,
  fromAddress: address,
  toAddress: address,
  seq: 0,
  signature: signature,
}
InstallAck = {
  protocol: 4,
  multisig: address,
  data: InstallData,
  fromAddress: address,
  toAddress: address,
  seq: 1,
  signature: signature,
}
```

## Notes

```
InstallData.peer1.address < InstallData.peer2.address;
```

## Main Files

- `install-proposer.ts`
- `cf-op-install.ts`

see also: `MultiSend.sol` for how multisend transactions are decoded

## Commitment

### Parameters

- `freeBalance.cfAddress`
- `freeBalance.appStateHash`
- `freeBalance.localNonce`
- `freeBalance.timeout`
- `salt`
- `key`
- `app.cfAddress`
- `assetType`
- `limit`
- `token`

### Transaction

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
                            freebalance.appStateHash,
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
                    0, salt, 1
                ]
            ),
        ]
    ) + encodeArgs(/* do conditional transfer */
        ("uint256", "address", "uint256", "bytes"),
        [
            1,
            CONDITIONAL_TRANSFER,
            0,
            encode(
                "executeAppConditionalTransfer(address,address,bytes32,uint256,bytes32,tuple(uint8,uint256,address))",
                [
                    NONCE_REGISTRY,
                    key,
                    1,
                    app.cfAddress
                    (
                        assetType,
                        limit,
                        token
                    )
                ]
            )
        ]
    )
)
```