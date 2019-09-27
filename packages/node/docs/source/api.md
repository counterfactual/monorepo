# Node API

The Node exposes a JSON-RPC compliant API. This can be consumed by making RPC calls and by registering event listeners.

## Message Format

A "message" is a return value of an RPC call or the value passed to an event listener. Messages have the following fields:

- `type: string`
  - Name of the Method or Event that this message represents e.g. "getAppInstances", "install"
- `requestId?: string`
  - Unique ID for a Method request.
  - Only required for Methods. Leave empty for Events.
- `data: { [key: string]: any }`
  - Data payload for this message.
  - See "Result" section of a Method and "Data" section of an Event for details.

## Public RPC Methods

### Method: `getAppInstances`

Returns all app instances currently installed on the Node.

NOTE: This is terrible from a security perspective. In the future this method will be changed or deprecated to fix the security flaw.

Params: None

Result:

- `appInstances:`[`AppInstanceInfo`](#data-type-appinstanceinfo)`[]`
  - All the app instances installed on the Node

### Method: `proposeInstall`

Requests that a peer start the install protocol for an app instance. At the same time, authorize the installation of that app instance, and generate and return a fresh ID for it. If the peer accepts and the install protocol completes, its ID should be the generated appInstanceId.

Params:

- `proposedToIdentifier: string`
  - Public identifier of the peer responding to the installation request of the app
- `appDefinition: string`
  - On-chain address of App Definition contract
- `abiEncodings:`[`AppABIEncodings`](#data-type-appabiencodings)
  - ABI encodings used for states and actions of this app
- `initiatorDeposit: BigNumber`
  - Amount of the asset deposited by this user
- `initiatorDepositTokenAddress?: string`
  - An optional string indicating whether an ERC20 token should be used for funding the proposer's side of the app. If not specified, this defaults to ETH.
- `responderDeposit: BigNumber`
  - Amount of the asset deposited by the counterparty
- `responderDepositTokenAddress?: string`
  - An optional string indicating whether an ERC20 token should be used for funding the peer's side of the app. If not specified, this defaults to ETH.
- `timeout: BigNumber`
  - Number of blocks until a submitted state for this app is considered finalized
- `initialState:`[`AppState`](#data-type-appstate)
  - Initial state of app instance

Result:

- `appInstanceId: string`
  - Generated appInstanceId

Errors: (TODO)

- Not enough funds

### Method: `rejectInstall`

Reject an app instance installation.

Params:

- `appInstanceId: string`
  - ID of the app instance to reject

Result: "OK"

Errors: (TODO)

- Proposed app instance doesn't exist

### Method: `install`

Install an app instance.

Params:

- `appInstanceId: string`
  - ID of the app instance to install
  - Counterparty must have called `proposedInstall` and generated this ID

Result:

- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
  - Successfully installed app instance

Errors: (TODO)

- Counterparty rejected installation

### Method: `installVirtual`

Install a virtual app instance.

Params:

- `appInstanceId: string`
  - ID of the app instance to install
  - Counterparty must have called `proposedInstall` and generated this ID
- `intermediaryIdentifier: string`
  - Node identifier of hub to route the virtual app installation through

Result:

- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
  - Successfully installed app instance

Errors: (TODO)

- Counterparty rejected installation

### Method: `getState`

Get the latest state of an app instance.

Params:

- `appInstanceId: string`
  - ID of the app instance to get state of

Result:

- `state:`[`AppState`](#data-type-appstate)
  - Latest state of the app instance

Errors: (TODO)

- App not installed

### Method: `getAppInstanceDetails`

Get details of an app instance.

Params:

- `appInstanceId: string`
  - ID of the app instance to get details of

Result:

- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
  - App instance details

### Method: `getProposedAppInstance`

Get details of a proposed app instance.

Params:

- `appInstanceId: string`
  - ID of the app instance to get details of

Result:

- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
  - App instance details

### Method: `takeAction`

Take action on current app state to advance it to a new state.

Params:

- `appInstanceId: string`
  - ID of the app instance for which to take action
- `action:`[`SolidityValueType`](#data-type-appaction)
  - Action to take on the current state

Result:

- `newState:`[`AppState`](#data-type-appstate)
  - New app state

Errors: (TODO)

- Illegal action

### Method: `uninstall`

Uninstall an app instance, paying out users according to the latest signed state.

Params:

- `appInstanceId: string`
  - ID of the app instance to uninstall

Result: "OK"

Errors: (TODO)

- App state not terminal

### Method: `proposeState`

TODO

### Method: `acceptState`

TODO

### Method: `rejectState`

TODO

### Method: `createChannel`

Creates a channel and returns the determined address of the multisig (does not deploy).

Params:

- `owners: string[]`
  - the addresses who should be the owners of the multisig

Result:

- `CreateChannelTransactionResult`
  - `multisigAddress: string`
    - the address which will hold the state deposits

### Method: `deployStateDepositHolder`

Deploys a multisignature wallet contract for use by the channel participants. Required step before withdrawal.

Params:

- `multisigAddress: string`
  - address of the multisignature wallet
- `retryCount?: number`
  - the number of times to retry _deploying the multisig_ using an expontential backoff period between each successive retry, starting with 1 second. This defaults to 3 if no retry count is provided.

Result:

- `DeployStateDepositHolderResult`
  - `transactionHash: string`
    - the hash of the multisig deployment transaction
      - This can be used to either register a listener for when the transaction has been mined or await the mining.

### Method: `getChannelAddresses`

Gets the (multisig) addresses of all the channels that are open on the Node.

Result:

- `addresses: string[]`
  - the list of multisig addresses representing the open channels on the Node.

### Method: `deposit`

If a token address is specified, deposits the specified amount of said token into the channel. Otherwise it defaults to ETH (denominated in Wei).

Params:

- `multisigAddress: string`
- `amount: BigNumber`
- `tokenAddress?: string`

Result:

- `multisigBalance: BigNumber`
  - the updated balance of the multisig

Error:

- "Insufficient funds"

### Method: `getStateDepositHolderAddress`

Retrieves the address for the state deposit used by the specified owners.

Params:

- `owners: string[]`
  - the addresses who own the state deposit holder

Result:

- `multisigAddress: string`
  - the address of the multisig (i.e. the state deposit holder)

### Method: `withdraw`

If a token address is specified, withdraws the specified amount of said token from the channel. Otherwise it defaults to ETH (denominated in Wei). The address that the withdrawal is made to is either specified by the `recipient` parameter, or if none is specified defaults to `ethers.utils.computeAddress(ethers.utils.HDNode.fromExtendedKey(nodePublicIdentifier).derivePath("0").publicKey)`. `deployStateDepositHolder` must be called before this method can be used to withdraw funds.

Params:

- `multisigAddress: string`
- `amount: BigNumber`
- `recipient?: string`
- `tokenAddress?: string`

Result:

- `recipient: string`
  - The address to whom the withdrawal is made
- `txHash: string`
  - The hash of the transaction in which the funds are transferred from the state deposit holder to the recipient

Error(s):

- "Insufficient funds"
- "Withdraw Failed"

### Method: `withdrawCommitment`

This behaves similarly to the `withdraw` call, except it produces a commitment for the withdrawal and returns the commitment instead of sending the commitment to the network.

Params:

- `multisigAddress: string`
- `amount: BigNumber`
- `recipient?: string`
- `tokenAddress?: string`

Result:

- `transaction: { to: string; value: BigNumberish; data: string; }`

Error(s):

- "Insufficient funds"

### Method: `getFreeBalance`

Gets the free balance AppInstance of the specified channel for the specified token. Defaults to ETH if no token is specified.

Params:

- `multisigAddress: string`
- `tokenAddress?: string`

Result:

```
{
    [s: string]: BigNumber;
};
```

Returns a mapping from address to balance in wei. The address of a node with public identifier `publicIdentifier` is defined as `fromExtendedKey(publicIdentifier).derivePath("0").address`.

Note: calling this with a specific token address will return Zero even if the channel has never had any deposits/withdrawals of that token.

### Method: `getTokenIndexedFreeBalanceStates`

Gets the free balances for the ETH and ERC20 assets that have been deposited, indexed by token address.

Params:

- `multisigAddress: string`

Result:

```
{
  [tokenAddress: string]: {
    [beneficiary: string]: BigNumber;
  }
};
```

Returns a doubly-nested mapping. The outer mapping is the address of the token for which there is free balance in the channel. The inner mapping is a mapping from address to balance in wei. The address of a node with public identifier `publicIdentifier` is defined as `fromExtendedKey(publicIdentifier).derivePath("0").address`.

## Events

### Event: `depositEvent`

Fired if a deposit has been made by a counter party.

Data:

- `multisigAddress: string`
  - The address of the channel that the deposit was made into.
- `amount: BigNumber`
  - The amount that was deposited by the counter party.

### Event: `installEvent`

Fired if new app instance was successfully installed.

Data:

- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
  - Newly installed app instance

### Event: `rejectInstallEvent`

Fired if installation of a new app instance was rejected.

Data:

- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
  - Rejected app instance

### Event: `updateStateEvent`

Fired if app state is successfully updated.

Data:

- `appInstanceId: string`
  - ID of app instance whose app state was updated
- `newState:`[`AppState`](#data-type-appstate)
- `action?:`[`SolidityValueType`](#data-type-appaction)
  - Optional action that was taken to advance from the old state to the new state

### Event: `uninstallEvent`

Fired if app instance is successfully uninstalled

Data:

- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
  - Uninstalled app instance

### Event: `proposeStateEvent`

TODO

### Event: `rejectStateEvent`

TODO

### Event: `createChannelEvent`

Fired when a Node receives a message about a recently-created channel whose multisignature wallet's list of owners includes this (i.e. the receiving) Node's address.

Note: On the Node calling the creation of the channel, this event _must_ have a registered callback to receive the multisig address _before_ the channel creation call is made to prevent race conditions.

Data:

- `CreateChannelResult`
  - `counterpartyXpub: string`
    - Xpub of the counterparty that the channel was opened with
  - `multisigAddress: string`
    - The address of the multisig that was created
  - `owners: string[]`
    - The list of multisig owners of the created channel

## Data Types

### Data Type: `AppInstanceInfo`

An instance of an installed app.

- `id: string`
  - Opaque identifier used to refer to this app instance
  - No two distinct app instances (even in different channels) may share the same ID
- `appDefinition: string`
  - On-chain address of App Definition contract
- `abiEncodings:`[`AppABIEncodings`](#data-type-appabiencodings)
  - ABI encodings used for states and actions of this app
- `initiatorDeposit: BigNumber`
  - Amount of the asset deposited by this user
- `responderDeposit: BigNumber`
  - Amount of the asset deposited by the counterparty
- `timeout: BigNumber`
  - Number of blocks until a submitted state for this app is considered finalized
- `intermediaryIdentifier?: string`
  - Xpub of a hub to route the virtual app installation through. Undefined if app instance is not virtual.

### Data Type: `AppABIEncodings`

- `stateEncoding: string`
  - ABI encoding of the app state
    - For example, for the Tic Tac Toe App (https://github.com/counterfactual/monorepo/blob/master/packages/apps/contracts/TicTacToeApp.sol), the state encoding string is `"tuple(uint256 versionNumber, uint256 winner, uint256[3][3] board)"`.
- `actionEncoding?: string`
  - Optional ABI encoding of the app action
  - If left blank, instances of the app will only be able to update state using [`proposeState`](#method-proposestate)
  - If supplied, instances of this app will also be able to update state using [`takeAction`](#method-takeaction)
    - Again, for the Tic Tac Toe App, the action encoding string is `"tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)"`.

### Data Type: `AppState`

- Plain Old Javascript Object representation of the state of an app instance.
- ABI encoded/decoded using the `stateEncoding` field on the instance's [`AppABIEncodings`](#data-type-appabiencodings).

### Data Type: `SolidityValueType`

- Plain Old Javascript Object representation of the action of an app instance.
- ABI encoded/decoded using the `actionEncoding` field on the instance's [`AppABIEncodings`](#data-type-appabiencodings).
