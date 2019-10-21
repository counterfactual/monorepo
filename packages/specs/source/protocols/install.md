# Install Protocol

The **Install Protocol** can be followed to allocate some funds inside of a `StateChannel` to a new `AppInstance`.

## Commitments

In order for some of the funds in the multisignature wallet to be securely considered "allocated" to some `AppInstance`, there must exist a `DELEGATECALL` transaction to some contract which defines the logic for spending it and then executes the on-chain state transition to make it happen. In particular, this contract must do the following:

1. **Get the list of funded apps.** Go the `ChallengeRegistry` for the final outcome of the `FreeBalance` `AppInstance` to see the list of `activeApps`.

2. **Verify this app is funded.** Check that the `appInstanceIdentityHash` of a particular `AppInstance` is in the list of `activeApps`.

3. **Get the outcome of the app.** Go to the `ChallengeRegistry` for the final outcome of the `AppInstance` that these funds were allocated to

4. **Execute the effect.** Forward this outcome to the `interpreterAddress` along with some `interpreterParams` to have that interpreter execute the on-chain state transition.

So, the commitments involved in this protocol must do two things:

1. **Execute a conditional transaction.** Ensure that there is a `DELEGATECALL` to the above mentioned contract (i.e., the "delegate target")

2. **Update the free balance state.** Ensure that there is a signed message to update the `FreeBalance` `AppInstance`'s state to include the new `appInstanceIdentityHash` in the `activeApps` array with the right amount of funds decrement from `balances`.

### The `ConditionalTransaction`

The pre-signed conditional transaction can be visually represented like this:

```eval_rst
.. mermaid:: ../diagrams/conditional-transaction-commitment.mmd
```

The digest that must be signed is the following:

```js
keccak256(
  abi.encodePacked(
    byte(0x19),

    // Array of addresses of the owners of the multsig
    multisigOwners,

    // Address of the ConditionalTransactionDelegateTarget.sol library
    to,

    // A value of 0 as no ETH is being sent
    0,

    // The encoded function call to the delegate target
    abi.encodeWithSignature(
      // The name of the method in ConditionalTransactionDelegateTarget.sol
      "executeEffectOfInterpretedAppOutcome(address,bytes32,bytes32,address,bytes)",

      // Address of the global registry for on-chain challenges
      challengeRegistryAddress,

      // The unique identifier of the FreeBalance AppInstance
      freeBalanceAppIdentityHash,

      // The unique identifier of the AppInstance funds were allocated to
      appIdentityHash,

      // The address of the interpreter handling the outcome
      interpreterAddress,

      // Any extra data to pass to the interpreter function
      interpreterParams
    ),

    // An enum representing a DELEGATECALL
    1
  )
);
```

The signatures of this digest will be passed into the `execTransaction` method on the multisignature wallet.

### The `FreeBalanceSetState`

The commitment to be signed to the `FreeBalance` `AppInstance` is identical to what would be signed in an **Update Protocol** commitment. The state update is such that the balances decrease of each participants in the `balances` array of their `FreeBalanceApp` and there is an added entry in the `activeApps` array.

## Messages

```eval_rst
.. mermaid:: ../diagrams/install-protocol-exchange.mmd
```

### Types

First we introduce a new type which we label `InstallParams`.

**Type: `InstallParams`**

|             Field              |      Type      |                            Description                             |
| ------------------------------ | -------------- | ------------------------------------------------------------------ |
| `initiatorBalanceDecrement`    | `uint256`      | The deposit into the AppInstance of the first party                |
| `responderBalanceDecrement`    | `uint256`      | The deposit into the AppInstance of the second party               |
| `initiatorDepositTokenAddress` | `address`      |                                                                    |
| `responderDepositTokenAddress` | `address`      |                                                                    |
| `participants`                 | `address[]`    | The unique participants for this AppInstance                       |
| `initialState`                 | `object`       | An object representing the initial state of the AppInstance        |
| `appInterface`                 | `AppInterface` | The definition of the interface of the AppInstance to be installed |
| `defaultTimeout`               | `uint256`      | The default challenge period length for this AppInstance           |
| `interpreterAddress`           | `address`      | The address of an interpreter that will interpret the outcome      |

> NOTE: `participants` are deterministically generated based on the appSeqNo of the application in relation to the entire channel lifecycle. Specifically the key is computed as the (`appSeqNo`)-th derived child of an extended public key that is the unique identifier for a state channel user.

### M1: Initiating signs `ConditionalTransaction`

|    Field    |                                Description                                |
| ----------- | ------------------------------------------------------------------------- |
| `protocol`  | `"install"`                                                               |
| `multisig`  | The address of the on-chain multisignature wallet for this `StateChannel` |
| `params`    | An `InstallParams` object describing the proposed app                     |
| `toXpub`    | The extended public key of the responder party                            |
| `seq`       | `1`                                                                       |
| `signature` | Signed copy of the `ConditionalTransaction` digest by initiator           |

### M2: Responder countersigns `ConditionalTransaction` and signs `FreeBalanceSetState`

|    Field     |                           Description                           |
| ------------ | --------------------------------------------------------------- |
| `protocol`   | `"install"`                                                     |
| `multisig`   | The address of the on-chain Alice-Bob multisignature wallet     |
| `toXpub`     | The extended public key of the initiator party                  |
| `seq`        | `-1`                                                            |
| `signature`  | Signed copy of the `ConditionalTransaction` digest by responder |
| `signature2` | Signed copy of the `FreeBalanceSetState` digest by responder    |

### M3: Initiator signs `FreeBalanceSetState`

|    Field    |                         Description                          |
| ----------- | ------------------------------------------------------------ |
| `protocol`  | `"install"`                                                  |
| `multisig`  | The address of the on-chain Alice-Bob multisignature wallet  |
| `params`    | An `InstallData` object describing the proposed app          |
| `toXpub`    | The extended public key of the responder party               |
| `seq`       | `-1`                                                         |
| `signature` | Signed copy of the `FreeBalanceSetState` digest by initiator |
