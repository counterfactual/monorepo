# CF.js API Specification V0.0.2

### `cfjs` Typescript Package

- `Provider`
    - Properties
        - `nodeProvider: NodeProvider`
            - Refer to `node-provider` package
    - Instance methods
        - `async getAppInstances(): AppInstance[]`
            - [Node method](#method-getappinstances)
        - `async install(appInstanceId: AppInstanceID): Promise<AppInstance>`
            - [Node method](#method-install)
        - `async rejectInstall(appInstanceId: AppInstanceID)`
            - [Node method](#method-rejectinstall)
    - Lifecycle
        - `on(eventType, callback: Function)`
            - `install`
                - [Node event](#event-installevent)
                - Callback Params: `(appInstance: AppInstance)`
            - `rejectInstall`
                - [Node event](#event-rejectinstallevent)
                - Callback Params: `(appInstance: AppInstance)`
            - `updateState`
                - [Node event](#event-updatestateevent)
                - Callback Params: `(appInstance: AppInstance, oldState: AppState, newState: AppState)`
            - `proposeState`
                - [Node event](#event-proposestateevent)
                - Callback Params: `(appInstance: AppInstance, oldState: AppState, newState: AppState)`
            - `rejectState`
                - [Node event](#event-rejectstateevent)
                - Callback Params: `(appInstance: AppInstance, state: AppState)`
            - `uninstall`
                - [Node event](#event-uninstallevent)
                - Callback Params: `(appInstance: AppInstance, finalState: AppState, myPayout: BigNumber, peerPayout: BigNumber)`
            - `multisigCreated`
                - [Node event](#event-multisigcreatedevent)
                - Callback Params: `(multisigAddress: Address, owners: Address[])`
- `AppFactory`
    - Properties
        - `provider: Provider`
        - `appId: string`
            - Address of the on-chain App Definition contract
        - `encodings:`[`AppABIEncodings`](#data-type-appabiencodings)
    - Instance methods
        - `async proposeInstall({
                peerAddress: Address,
                asset: BlockchainAsset,
                myDeposit: BigNumberish,
                peerDeposit: BigNumberish,
                initialState: AppState
           }): Promise<AppInstanceID>`
           - [Node method](#method-proposeinstall)
- `AppInstance`
    - Extends [`AppInstanceInfo` data type](#data-type-appinstanceinfo)
    - Properties
        - `manifestUri: string`
            - TODO
    - Instance methods
        - `async takeAction(action: AppAction): Promise<AppState>`
            - [Node method](#method-takeaction)
            - Returns ABI decoded representation of the latest signed state of the app.
            - Throws error if app definition "appActionEncoding" is not defined
        - `async uninstall()`
            - [Node method](#method-uninstall)
            - Uninstall the app instance
        - `async getState(): AppState`
            - [Node method](#method-getstate)
            - Get the latest signed state
        - `async getManifest(): AppManifest`
            - TODO
        - `async proposeState(state: AppState)`
            - [Node method](#method-proposestate)
            - TODO
            - Proposes a state to countersign
        - `async acceptState(state: AppState)`
            - [Node method](#method-acceptstate)
            - TODO
            - Accept a proposed state
        - `async rejectState(state: AppState)`
            - [Node method](#method-rejectstate)
            - TODO
            - Reject a proposed state
    - App lifecycle
        - `on(eventType, callback: Function)`
            - eventTypes
                - `updateState`
                    - [Node event](#event-updatestateevent)
                - `uninstall`
                    - [Node event](#event-uninstallevent)
                - `proposeState`
                    - [Node event](#event-proposestateevent)
                - `rejectState`
                    - [Node event](#event-rejectstateevent)
- `types`
    - Everything under [Data Types](#data-types) except `AppInstanceInfo`
    - `AppManifest`
        - TODO
        - `name`: human-readable name of app e.g. "TicTacToe"
        - `version`: semantic version of app definition contract
        - `definition: AppDefinition`

Node Protocol
=============

Message Format
--------------

Messages in the Node Protocol have the following fields:

- `type: string`
    - Name of the Method or Event that this message represents e.g. "getAppInstances", "install"
- `requestId?: string`
    - Unique ID for a Method request.
    - Only required for Methods. Leave empty for Events.
- `data: { [key: string]: any }`
    - Data payload for this message.
    - See "Result" section of a Method and "Data" section of an Event for details.

Public Methods
--------------

### Method: `getAppInstances`

Returns all app instances currently installed on the Node.

NOTE: This is terrible from a security perspective. In the future this method will be changed or deprecated to fix the security flaw.

Params: None

Result:
- `appInstances:`[`AppInstanceInfo`](#data-type-appinstanceinfo)`[]`
    - All the app instances installed on the Node

### Method: `proposeInstall`

Requests that a peer authorize the installation of an app instance. At the same time, generate and returns a fresh ID for it, and authorize the installation of that app instance.

Params:
- `peerAddress: string`
    - Address of the peer to request installation of the app with
- `appId: string`
    - On-chain address of App Definition contract
- `abiEncodings:`[`AppABIEncodings`](#data-type-appabiencodings)
    - ABI encodings used for states and actions of this app
- `asset:`[`BlockchainAsset`](#data-type-blockchainasset)
    - The asset used for deposits into this app
- `myDeposit: BigNumber`
    - Amount of the asset deposited by this user
- `peerDeposit: BigNumber`
    - Amount of the asset deposited by the counterparty
- `timeout: BigNumber`
    - Number of blocks until a submitted state for this app is considered finalized
- `initialState:`[`AppState`](#data-type-appstate)
    - Initial state of app instance

Result:
- `appInstanceId: string`
    - ID of an app instance whose proposed installation was accepted

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


### Method: `takeAction`

Take action on current app state to advance it to a new state.

Params:
- `appInstanceId: string`
    - ID of the app instance for which to take action
- `action:`[`AppAction`](#data-type-appaction)
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

### Method: `createMultisig`

Creates a multisignature wallet address.

Params:

- `owners: Address[]`
    - the addresses who should be the owners of the multisig

Result:

- `multisigAddress: Address`
    - the address of the multisig that was created

### Method: `getChannelAddresses`

Gets the (multisig) addresses of all the channels that are open on the Node.

Result:

- `addresses: Address[]`
    - the list of multisig addresses representing the open channels on the Node.


Events
------

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
- `oldState:`[`AppState`](#data-type-appstate)
- `action?:`[`AppAction`](#data-type-appaction)
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

### Event: `multisigCreatedEvent`

Fired if a peer Node created a multisig whose list of owners includes this (i.e. the receiving) Node's address.

Data:

- `multisigAddress: Address`
    - The address of the multisig that was created
- `owners: Address[]`
    - The list of owners for the created multisig


Data Types
----------

### Data Type: `AppInstanceInfo`

An instance of an installed app.

- `id: string`
    - Opaque identifier used to refer to this app instance
    - No two distinct app instances (even in different channels) may share the same ID
- `appId: string`
    - On-chain address of App Definition contract
- `abiEncodings:`[`AppABIEncodings`](#data-type-appabiencodings)
    - ABI encodings used for states and actions of this app
- `asset:`[`BlockchainAsset`](#data-type-blockchainasset)
    - The asset used for deposits into this app
- `myDeposit: BigNumber`
    - Amount of the asset deposited by this user
- `peerDeposit: BigNumber`
    - Amount of the asset deposited by the counterparty
- `timeout: BigNumber`
    - Number of blocks until a submitted state for this app is considered finalized

### Data Type: `BlockchainAsset`
- `assetType: number`
    - The type of the asset.
    - Set 0 for ETH, 1 for ERC20 token, 2 for Other.
- `token?: string`
    - Optional address of token contract if assetType is set to 1.

### Data Type: `AppABIEncodings`
- `stateEncoding: string`
    - ABI encoding of the app state
- `actionEncoding?: string`
    - Optional ABI encoding of the app action
    - If left blank, instances of the app will only be able to update state using [`proposeState`](#method-proposestate)
    - If supplied, instances of this app will also be able to update state using [`takeAction`](#method-takeaction)

### Data Type: `AppState`

- Plain Old Javascript Object representation of the state of an app instance.
- ABI encoded/decoded using the `stateEncoding` field on the instance's [`AppABIEncodings`](#data-type-appabiencodings).

### Data Type: `AppAction`

- Plain Old Javascript Object representation of the action of an app instance.
- ABI encoded/decoded using the `actionEncoding` field on the instance's [`AppABIEncodings`](#data-type-appabiencodings).

