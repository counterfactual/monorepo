# API V0.0.2
## `cf.js`

- `Provider`
    - Properties
        - `nodeProvider: NodeProvider`
    - Instance methods
        - `async getAppInstances(): AppInstance[]`
        - `createAppFactory(appDefinition: AppDefinition): AppFactory`
    - Lifecycle
        - `on(eventType, callback: Function)`
            - eventTypes
                - `install(appInstance)`
                - `rejectInstall(appInstance)`
                - `updateState(appInstance, oldState, newState, action?)`
                - `uninstall(appInstance)`
                - `proposeState(appInstance, oldState, newState)`
- `AppFactory`
    - Properties
        - `appDefinition: AppDefinition`
    - Instance methods
        - `async proposeInstall({
                peerAddress: Address,
                asset: BlockchainAsset,
                myDeposit: BigNumberish,
                peerDeposit: BigNumberish,
                initialState: any
           }): Promise<AppInstanceID>`
        - `async install(appInstanceId: AppInstanceID): Promise<AppInstance>`
        - `async getAppInstances(): Promise<AppInstance[]>`
- `AppInstance`
    - Properties
        - `id: AppInstanceID` — Identifier for this specific app instance
        - `definition: AppDefinition`
        - `terms: AppTerms`
        - `manifestUri: string`
    - Instance methods
        - `async applyAction(action: AppAction): AppState`
            - Returns ABI decoded representation of the latest signed state of the app.
            - Throws error if app definition "appActionEncoding" is not defined
        - `async proposeState(state: AppState)`
            - Proposes a state to countersign
            - Throws error if app definition "appActionEncoding" is defined
        - `async acceptState(state: AppState)`
            - Throws error if app definition "appActionEncoding" is defined
        - `async rejectState(state: AppState)`
            - Throws error if app definition "appActionEncoding" is defined
        - `async uninstall()`
            - Uninstall the app
        - `async getManifest(): AppManifest`
        - `async getState(): any`
    - App lifecycle
        - `on(eventType, callback: Function)`
            - eventTypes
                - `updateState(newState)`
                - `uninstall()`
                - `proposeState(newState)`
- `types`
    - `NodeProvider` (external)
        - (Injected into webpage)
        - Instance methods
            - `postMessage(message)`
            - `onMessage(callback)`
    - `AppInstanceID`: string
    - `AppState`: object, a POJO describing app state, encoded using app state encoding
    - `AppAction`: object, a POJO describing app action, encoded using app action encoding
    - `BlockchainAsset`:
        - `assetType`: ETH or ERC20 or OTHER
        - `token`: Address of token contract if applicable
    - `AppTerms`:
        - `asset: BlockchainAsset`
        - `limit`: Funds limit committed to app
    - `AppDefinition`
        - `address`: on-chain address for the app definition contract
        - `appStateEncoding`: ABI encoding for App State.
        - `appActionEncoding`: Optional ABI encoding for App Action. 
            - Leave empty to signify that app state updates using state proposals, not actions.
    - `AppManifest`
        - `name`: human-readable name of app e.g. "TicTacToe"
        - `version`: semantic version of app definition contract
        - `definition: AppDefinition`
