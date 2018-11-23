# CF.js API Specification V0.0.2

### `cfjs` Typescript Package

- `Provider`
    - Properties
        - `nodeProvider: NodeProvider`
            - Refer to `node-provider` package
    - Instance methods
        - `async getAppInstances(): AppInstance[]`
            - [Node method](#getappinstances)
        - `async install(appInstanceId: AppInstanceID): Promise<AppInstance>`
           - [Node method](#install)
        - `async rejectInstall(appInstanceId: AppInstanceID)`
            - [Node method](#rejectinstall)
    - Lifecycle
        - `on(eventType, callback: Function)`
            - `install`
                - [Node event](#install-event)
                - Params: `(appInstance: AppInstance)`
            - `rejectInstall`
                - [Node event](#rejectinstall-event)
                - Params: `(appInstance: AppInstance)`
            - `updateState`
                - [Node event](#rejectinstall-event)
                - Params: `(appInstance: AppInstance, oldState: AppState, newState: AppState)`
            - `proposeState`
                - [Node event](#proposestate-event)
                - Params: `(appInstance: AppInstance, oldState: AppState, newState: AppState)`
            - `rejectState`
                - [Node event](#rejectstate-event)¡
                - Params: `(appInstance: AppInstance, state: AppState)`
            - `uninstall`
                - [Node event](#uninstall-event)
                - Params: `(appInstance: AppInstance, finalState: AppState, myPayout: BigNumber, peerPayout: BigNumber)`
- `AppFactory`
    - Properties
        - `provider: Provider`
        - `appDefinition: AppDefinition`
    - Instance methods
        - `async proposeInstall({
                peerAddress: Address,
                asset: BlockchainAsset,
                myDeposit: BigNumberish,
                peerDeposit: BigNumberish,
                initialState: AppState
           }): Promise<AppInstanceID>`
           - [Node method](#proposeinstall)
- `AppInstance`
    - Extends [`AppInstance` data type](#appinstance)
    - Properties
        - `manifestUri: string`
            - TODO
    - Instance methods
        - `async takeAction(action: AppAction): Promise<AppState>`
            - [Node method](#takeaction)
            - Returns ABI decoded representation of the latest signed state of the app.
            - Throws error if app definition "appActionEncoding" is not defined
        - `async uninstall()`
            - [Node method](#uninstall)
            - Uninstall the app instance
        - `async getState(): AppState`
            - [Node method](#getstate)
            - Get the latest signed state
        - `async getManifest(): AppManifest`
            - TODO
        - `async proposeState(state: AppState)`
            - TODO
            - Proposes a state to countersign
        - `async acceptState(state: AppState)`
            - TODO
            - Accept a proposed state 
        - `async rejectState(state: AppState)`
            - TODO
            - Reject a proposed state 
    - App lifecycle
        - `on(eventType, callback: Function)`
            - eventTypes
                - `updateState`
                    - [Node event](#updatestate-event)
                - `uninstall`
                    - [Node event](#uninstall)
                - `proposeState`
                    - [Node event](#proposestate-event)
                - `rejectState`
                    - [Node event](#rejectstate-event)
- `types`
    - Everything under [Data Types](#data-types) except `AppInstance` 
    - `AppManifest`
        - TODO
        - `name`: human-readable name of app e.g. "TicTacToe"
        - `version`: semantic version of app definition contract
        - `definition: AppDefinition`

Node Protocol
=============

Public Methods
--------------

#### getAppInstances

Returns **all** app instances currently installed on the Node. 

**NOTE**: This is terrible from a security perspective. In the future this method will be changed or deprecated to fix the security flaw. 

Params: `[]`

Result: list of [AppInstance](#appinstance)

#### proposeInstall

Generate an app instance ID given details about an app installation.  

Params:
- `peerAddress: string` 
    - Address of the peer to install the app with
- `appId: string` 
    - On-chain address of App Definition contract
- `abiEncodings: `[`AppABIEncodings`](#appabiencodings)
    - ABI encodings used for states and actions of this app
- `asset: `[`BlockchainAsset`](#blockchainasset)
    - The asset used for deposits into this app
- `myDeposit: BigNumber`
    - Amount of the asset deposited by this user
- `peerDeposit: BigNumber`
    - Amount of the asset deposited by the counterparty
- `timeout: BigNumber`
    - Number of blocks until a submitted state for this app is considered finalized
- `initialState: `[`AppState`](#appstate)
    - Initial state of app instance
    
Result: 
- `appInstanceId: string`
    - Unique ID for this app instance 

Errors: (TODO)
- Not enough funds

#### rejectInstall

Reject an app instance installation. 

Params:
- `appInstanceId: string`
    - Unique ID for the app instance to reject 
    
Result: "OK"

Errors: (TODO)
- Proposed app instance doesn't exist

#### install

Install an app instance. 

Params:
- `appInstanceId: string`
    - Unique ID for the app instance to install 
    

Result:
- `appInstance: `[`AppInstance`](#appinstance)
    - Successfully installed app instance

Errors: (TODO)
- Counterparty rejected installation

#### getState

Get the latest state of an app instance.

Params:
- `appInstanceId: string`
    - Unique ID of the app instance 

Result:
- `state: `[`AppState`](#appstate)
    - Latest state of the app instance
  
Errors: (TODO)
- App not installed


#### getAppInstanceDetails

Get details of an app instance.

Params:
- `appInstanceId: string`
    - Unique ID of the app instance 

Result:
- `appInstance: `[`AppInstance`](#appinstance)
    - App instance details


#### takeAction

Take action on current app state to advance it to a new state.

Params:
- `appInstanceId: string`
    - Unique ID of the app instance 
    - Action to take on the current state 

Result:
- `newState: `[`AppState`](#appstate)
    - New app state

Errors: (TODO)
- Illegal action

#### uninstall

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

#### proposeState

TODO

#### acceptState

TODO

#### rejectState

TODO


Events
------

#### install event

Fired if new app instance was successfully installed.

Params:
- `appInstance: `[`AppInstance`](#appinstance)
    - Newly installed app instance

#### rejectInstall event

Fired if installation of a new app instance was rejected.

Params:
- `appInstance: `[`AppInstance`](#appinstance)
    - Rejected app instance

#### updateState event

Fired if app state is successfully updated.

Params:
- `appInstanceId: string`
    - Unique ID of app instance
- `newState: `[`AppState`](#appstate)
- `oldState: `[`AppState`](#appstate)
- `action?: `[`AppAction`](#appaction)
    - Optional action that was taken to advance from the old state to the new state

#### uninstall event

Fired if app instance is successfully uninstalled

Params:
- `appInstance: `[`AppInstance`](#appinstance)
    - Uninstalled app instance
- `myPayout: BigNumber`
    - Amount of the asset paid out to this user 
- `peerPayout: BigNumber`
    - Amount of the asset paid out to peer

#### proposeState event

TODO

#### rejectState event

TODO

### Data Types

#### `AppInstance`

An instance of an installed app.

- `id: string` 
    - Unique ID for this app instance
- `appId: string` 
    - Unique ID for this app
    - Currently corresponds to on-chain address of App Definition contract
- `abiEncodings: `[`AppABIEncodings`](#appabiencodings)
    - ABI encodings used for states and actions of this app
- `asset: `[`BlockchainAsset`](#blockchainasset)
    - The asset used for deposits into this app
- `myDeposit: BigNumber`
    - Amount of the asset deposited by this user
- `peerDeposit: BigNumber`
    - Amount of the asset deposited by the counterparty
- `timeout: BigNumber`
    - Number of blocks until a submitted state for this app is considered finalized
   
#### `BlockchainAsset`
- `assetType: number`
    - The type of the asset.
    - Set 0 for ETH, 1 for ERC20 token, 2 for Other.
- `token?: string`
    - Optional address of token contract if assetType is set to 1.

#### `AppABIEncodings`
- `stateEncoding: string` 
    - ABI encoding of the app state
- `actionEncoding?: string`
    - Optional ABI encoding of the app action
    - If left blank, instances of the app will only be able to update state using [`proposeState`](#proposestate)
    - If supplied, instances of this app will also be able to update state using [`takeAction`](#takeaction) 

#### AppState

- Plain Old Javascript Object representation of the state of an app instance.
- ABI encoded/decoded using the `stateEncoding` field on the instance's [`AppABIEncodings`](#appabiencodings).

#### AppAction

- Plain Old Javascript Object representation of the action of an app instance.
- ABI encoded/decoded using the `actionEncoding` field on the instance's [`AppABIEncodings`](#appabiencodings).

