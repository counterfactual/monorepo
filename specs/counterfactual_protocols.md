# Counterfactual Protocols

This document specifies the handshakes and message formats of the following counterfactual protocols:

- Install
- Uninstall
- Update
- Funding
- Free Balance Deposit
- App Deposit
- Withdraw
- Metachannel Create
- Metachannel Close
- Metechannel Deposit
- Metachannel Withdraw

## Message Format

All messages are of the format:

**Header:** [`protocol`: `1 byte`, `signature`: `65 bytes`, `ack-countersignature`: `65 bytes`]\
**Body:** [`Array<CfOperation>`, ...]

where the body is used by receivers of messages to reconstruct (and thus validate) the digest of the signature.

// TODO: consider a nonce field in the header

## CfOperation

Before describing the protocols, define three types of `CfOperation`:

 ```
CfInstall = {
    app = {
        id: uint,
        constructor_params = {
            owner: address,
            registry: address,
            wasDeclaredFinal: bool,
            finalizesAt: uint256,
            id: uint256,
            latestNonce: uint256,
            deltaTimeout: uint256,;
        }
        asset_class_id: uint,
        amount1: uint,
        amount2: uint
    },
    // note: don't actually need the two fields below since they can be derived
	free_balance = {
		amount: uint
	},
	nonce = {
		vector_keys = Array<CfId>,
		vector_values = Array<uint>
	}
}
CfUninstall = {
    app: {
        id: uint,
        amount1: uint,
        amount2: uint
	},
    nonce: {
	    remove_key: CfId,
	},
    free_ balance: {
        amount1: uint,
        amount2: uint
    }
}
CfUpdate = {
    app: {
        id: uint,
        state: bytes
        nonce: uint
    }
}
```

Using these three operations, we build the following protocols.

## Protocols

### Install

**Handshake:**

|A|B|
|-|-|
|`Install`||
||`InstallAck`|

**Install format:**

**Header**: [`protocol`: `0x00`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfInstall`]

**InstallAck format:**

**Header**: [`protocol`: `0x00`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None`

**Discussion:** Installing an app into a state channel requires a single delegatecall commitment  to a multi-send transaction from the multisig doing three things:
1. calls a conditional payment, commiting the requested amount of funds to the app's final state
2. updates the free balance contract to subtract the app's  allowance
3. updates the root vector nonce to reflect both the new app and the updated free balance

Thus, to validate the installation message--i.e., recreate the transaction and validate the given signature against the transaction--requires being able to recreate all three separate transactions.

Each transaction should be recreated separately by the module to which it belongs. For example, the `app`  module should recreate a tx from  `Install.app`, the `free_balance` module should recreate a tx from `Install.free_balance`, and the `nonce` module should recreate a tx from `Install.nonce`.

With all three transactions recreated by the modules, the channel layer can then recreate the exact multi-send transaction for which the given signature belongs, validate it, and countersign to send a responding InstallAck.

### Uninstall

**Handshake:**

|A|B|
|-|-|
|`Uninstall`||
||`UninstallAck`|

**Uninstall format:**

**Header**: [`protocol`: `0x01`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfUninstall`]

**UninstallAck format:**

**Header**: [`protocol`: `0x01`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None`

**Discussion:** Uninstalling a counterfactual application involves a multi-send transaction that commits the shared multisig to do three things:

1. Update  the root vector nonce to "delete" the app, i.e., removing the app's vector component from the nonce
2. Update the free balance contract to reimburse the respective participants according to the payout function of the uninstalled app.

Note: the "reimburse" amount is not calculated on chain at all. It is calculated and validated within the state-channel client and is reflected in the free balance contract update. (Alternatively, we could calculate the reimbursement amount in the commitment itself at the expense of more gas, if ever deployed, and without any obvious benefit.)

### Update

**Handshake:**

|A|B|
|-|-|
|`Update`||
||`UpdateAck`|


**Update format:**

**Header**: [`protocol`: `0x02`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfUpdate`]

**UpdateAck format:**

**Header**: [`protocol`: `0x02`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None

**Discussion:** **Update** messages are single calls from the multisig to an application contract to update the state of the application. This could be an update on a system module like a free balance, or a plugged in application module. In both cases, the state is defined by the module.

Upon receipt of an **Update**, the channel layer  passes the message to the module, asking the module to validate the signature matches the update state.

__An open question is how to deal with the countersignature.__

For example, in the current iteration of the installation protocol, we have a specific signature module that, in theory, propagates an installation request out to the user like a push notification, asking for a signature of the installation commitment.

However, we probably want signatures to work differently for application updates.

Instead, the application module could be responsible for not only validating the signature matches the given state, but also dealing with the signing itself. In many cases, like tic-tac-toe, the countersignature should probably happen automatically if the given update is a valid state transition according to the rules of the game.


### Funding

**Handshake:**

|A|B|
|-|-|
|`Funding`||
||`FundingAck`|
|`FundingFin`||
||`FundingFinAck`|

**Message format:**

**Funding format:**

**Header**: [`protocol`: `0x03`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfInstall(app=BalanceRefund(0, B))`]

**FundingAck format:**

**Header**: [`protocol`: `0x03`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: [`CfInstall(app=BalanceRefund(b, A))`] `// needs to finalize before previous BalanceRefund to be secure`

**FundingFin format:**

**Header**: [`protocol`: `0x03`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: [`CfUninstall(BalanceRefund(b, A))`, `CfUninstall(BalanceRefund(0, B))`]

**FundingFinAck format:**

**Header**: [`protocol`: `0x03`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None`


### Free Balance Deposit
|A|B|
|-|-|
|`FreeBalanceDeposit`||
||`FreeBalanceDepositAck`|
|`FreeBalanceDepositFin`||
||`FreeBalanceDepositFinAck`|


**Message format:**

**FreeBalanceDeposit format:**

**Header**: [`protocol`: `0x04`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfInstall(app=BalanceRefund(a+B, A))`]

**FreeBalanceDepositAck format:**

**Header**: [`protocol`: `0x04`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None`

**FreeBalanceDepositFin format:**

**Header**: [`protocol`: `0x04`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfUninstall(BalanceRefund(a+B, A))`]

**FreeBalanceDepositFinAck format:**

**Header**: [`protocol`: `0x04`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None`

### App Deposit
|A|B|
|-|-|
|`AppDeposit`||
||`AppDepositAck`|

**Message format:**

**AppDeposit format:**

**Header**: [`protocol`: `0x05`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfUpdate(FreeBalance(A=a-a', B=b)), CfInstall(app_id, constructor_params, A=app.a_amount + a', B=app.b_amount`)]

**AppDepositAck format:**

**Header**: [`protocol`: `0x05`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None`

### Withdraw
|A|B|
|-|-|
|`Withdraw`||
||`WithdrawAck`|
|`WithdrawFin`||
||`WithdrawFinAck`|

**Message format:**

**Withdraw format:**

**Header**: [`protocol`: `0x06`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfInstall(BalanceRefund(a-a', A))`, `CfUpdate(FreeBalance(A=a-a', B=b))`]

**WithdrawAck format:**

**Header**: [`protocol`: `0x06`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None`

**WithdrawFin format:**

**Header**: [`protocol`: `0x06`, `signature`: `[v: uint8, r: bytes32, s: bytes32]`, `ack-signature`: `None`]\
**Body**: [`CfUninstall(BalanceRefund(a-a', A))`]

**WithdrawFinAck format:**

**Header**: [`protocol`: `0x06`, `signature`: `None`, `ack-signature`: `[v: uint8, r: bytes32, s: bytes32]`]\
**Body**: `None`

### Metachannel Create

// TODO

### Metachannel Close

// TODO

### Metachannel Deposit

// TODO

### Metachannel Withdraw

// TODO
