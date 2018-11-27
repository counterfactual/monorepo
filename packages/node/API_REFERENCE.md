# Node API Specification V0.0.1

- `Node`

  - Properties
    - `private instructionExecutor: InstructionExecutor`
      - Refer to [`machine` package](https://github.com/counterfactual/monorepo/blob/master/packages/machine/src/instruction-executor.ts#L22)
    - `private keyStore: Map<string, HDWalletProvider>`
      - Maps account addresses that are used with hubs to their HDWalletProviders
  - `constructor`

    - `messagingService: IMessagingService`
    - `databaseService: IStore`
    - `web3Provider: Web3Provider`
    - `appWhitelist: AppID[]`
    - `networkContext: NetworkContext`
      - The network context in which this Node operates
      - [To be updated](https://github.com/counterfactual/monorepo/blob/ac6bdcff3aad6ac67159c51446c611d4d1b55ce6/packages/cf.js/src/legacy/network.ts#L5-L11)
    - `keyStore?: Map<string, HDWalletProvider>`
    - `peers?: StateDepositHolder[]`
      - Hub "connections" (index could indicate preference i.e. peers[0] is the default hub). Specified for client-side nodes.

  - Instance methods
    - `async createChannel`
      - Creates a channel with the specified hub (peerAddress) given the specified amount. Returns address of the multisig created between the account and the hub.
      - Params
        - `peerAddress: string`
        - `privateKey: string`
        - `depositAmount: BigNumber`
      - Returns
        - `Promise<string>`
    - `on`
      - Registers listeners on the Node for various requests (install, update, etc).
      - Params
        - `event: string`
        - `callback: Function`
      - Returns
        - `void`

### Interfaces for Dependency Injections

- `StateDepositHolder`

  - Each holder refers to one hub connection
  - Properties
    - `accountAddress: string`
    - `peerAddress: string`
    - `depositAddress: string`
      - The multisig address shared between the account and the hub
    - What else? Struct to capture metachannels info with the hub?

- `IMessagingService`

  - Instance methods
    - `on`
      - Params
        - `eventName: string`
        - `callback: Function`
    - `once`
      - Params
        - `eventName: string`
        - `callback: Function`
    - `emit`
      - Params
        - `eventName: string`
        - `data: any`

- `IStore`
  - Instance methods
    - `async setCommitment`
      - Params
        - `appInstanceID: string`
        - `commitmentType: CommitmentType`
          - [To be implemented](https://github.com/counterfactual/monorepo/blob/ac6bdcff3aad6ac67159c51446c611d4d1b55ce6/packages/cf.js/src/legacy/node/index.ts#L9-L12)
        - `commitment: Commitment`
      - Returns
        - `Promise<boolean>`
          - Indicates success or failure of setting commitment
    - `async getCommitment`
      - Params
        - `appInstanceID: string`
        - `commitmentType: CommitmentType`
      - Returns
        - `Promise<Commitment>`
    - ### Generic get/set functionality for persisting
      - `AppInstance`
      - information about connections to peers
      - key store?
      - app white list?
    - `async set`
      - Params
        - `key: string`
        - `value: any`
      - Returns
        - Promise<boolean>
          - Indicates success or failure of setting commitment
    - `async get`
      - Params
        - `key: string`
      - Returns
        - `Promise<any>`
