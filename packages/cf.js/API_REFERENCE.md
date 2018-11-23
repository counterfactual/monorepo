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
                - [Node event](#event-install)
                - Params: `(appInstance: AppInstance)`
            - `rejectInstall`
                - [Node event](#event-rejectinstall)
                - Params: `(appInstance: AppInstance)`
            - `updateState`
                - [Node event](#event-rejectinstall)
                - Params: `(appInstance: AppInstance, oldState: AppState, newState: AppState)`
            - `proposeState`
                - [Node event](#event-proposestate)
                - Params: `(appInstance: AppInstance, oldState: AppState, newState: AppState)`
            - `rejectState`
                - [Node event](#event-rejectstate)
                - Params: `(appInstance: AppInstance, state: AppState)`
            - `uninstall`
                - [Node event](#event-uninstall)
                - Params: `(appInstance: AppInstance, finalState: AppState, myPayout: BigNumber, peerPayout: BigNumber)`
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
                    - [Node event](#event-updatestate)
                - `uninstall`
                    - [Node event](#event-uninstall)
                - `proposeState`
                    - [Node event](#event-proposestate)
                - `rejectState`
                    - [Node event](#event-rejectstate)
- `types`
    - Everything under [Data Types](#data-types) except `AppInstanceInfo` 
    - `AppManifest`
        - TODO
        - `name`: human-readable name of app e.g. "TicTacToe"
        - `version`: semantic version of app definition contract
        - `definition: AppDefinition`

Node Protocol
=============

Public Methods
--------------

### Method: `getAppInstances`

Returns **all** app instances currently installed on the Node. 

**NOTE**: This is terrible from a security perspective. In the future this method will be changed or deprecated to fix the security flaw. 

Params: `[]`

Result: list of [`AppInstanceInfo`](#data-type-appinstanceinfo)

### Method: `proposeInstall`

Generate an app instance ID given details about an app installation.  

Params:
- `peerAddress: string` 
    - Address of the peer to install the app with
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
    - Unique ID for this app instance 

Errors: (TODO)
- Not enough funds

### Method: `rejectInstall`

Reject an app instance installation. 

Params:
- `appInstanceId: string`
    - Unique ID for the app instance to reject 
    
Result: "OK"

Errors: (TODO)
- Proposed app instance doesn't exist

### Method: `install`

Install an app instance. 

Params:
- `appInstanceId: string`
    - Unique ID for the app instance to install 
    

Result:
- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
    - Successfully installed app instance

Errors: (TODO)
- Counterparty rejected installation

### Method: `getState`

Get the latest state of an app instance.

Params:
- `appInstanceId: string`
    - Unique ID of the app instance 

Result:
- `state:`[`AppState`](#data-type-appstate)
    - Latest state of the app instance
  
Errors: (TODO)
- App not installed


### Method: `getAppInstanceDetails`

Get details of an app instance.

Params:
- `appInstanceId: string`
    - Unique ID of the app instance 

Result:
- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
    - App instance details


### Method: `takeAction`

Take action on current app state to advance it to a new state.

Params:
- `appInstanceId: string`
    - Unique ID of the app instance 
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
    - Unique ID of the app instance to uninstall

Result:
- `myPayout: BigNumber`
    - Amount of the asset paid out to this user 
- `peerPayout: BigNumber`
    - Amount of the asset paid out to peer
    
Errors: (TODO)
- App state not terminal  

### Method: `proposeState`

TODO

### Method: `acceptState`

TODO

### Method: `rejectState`

TODO


Events
------

### Event: `install`

Fired if new app instance was successfully installed.

Params:
- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
    - Newly installed app instance

### Event: `rejectInstall`

Fired if installation of a new app instance was rejected.

Params:
- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
    - Rejected app instance

### Event: `updateState`

Fired if app state is successfully updated.

Params:
- `appInstanceId: string`
    - Unique ID of app instance
- `newState:`[`AppState`](#data-type-appstate)
- `oldState:`[`AppState`](#data-type-appstate)
- `action?:`[`AppAction`](#data-type-appaction)
    - Optional action that was taken to advance from the old state to the new state

### Event: `uninstall`

Fired if app instance is successfully uninstalled

Params:
- `appInstance:`[`AppInstanceInfo`](#data-type-appinstanceinfo)
    - Uninstalled app instance
- `myPayout: BigNumber`
    - Amount of the asset paid out to this user 
- `peerPayout: BigNumber`
    - Amount of the asset paid out to peer

### Event: `proposeState`

TODO

### Event: `rejectState`

TODO

Data Types
----------

### Data Type: `AppInstanceInfo`

An instance of an installed app.

- `id: string` 
    - Unique ID for this app instance
- `appId: string` 
    - Unique ID for this app
    - Currently corresponds to on-chain address of App Definition contract
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

