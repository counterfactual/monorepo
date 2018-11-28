# Node API Specification V0.0.1

- `Node`

  - Properties
    - `private instructionExecutor: InstructionExecutor`
      - Refer to [`machine` package](https://github.com/counterfactual/monorepo/blob/master/packages/machine/src/instruction-executor.ts#L22)
  - `constructor`

    - `keyStore: ethers.utils.SigningKey`
    - `messagingService: IMessagingService`
    - `databaseService: IStore`
    - `web3Provider: Web3Provider`
    - `appWhitelist: AppID[]`
    - `networkContext: NetworkContext`
      - The network context in which this Node operates
      - [To be updated](https://github.com/counterfactual/monorepo/blob/ac6bdcff3aad6ac67159c51446c611d4d1b55ce6/packages/cf.js/src/legacy/network.ts#L5-L11)
    - `peers: string[]`

  - Instance methods
    - `async createMultisig`
      - Creates a multisig with the specified peer. Returns address of the multisig created between the account and the peer.
      - Params
        - `peerAddress: string`
      - Returns
        - `Promise<string>`
    - `on`
      - Registers listeners on the Node for various requests (install, update, etc) coming from other Nodes
      - Params
        - `event: string`
        - `callback: Function`
      - Returns
        - `void`
      - Events to register callbacks for are indicated as the [lifecycle events on the Node Provider](https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#cfjs-typescript-package)
    - `emit`
      - Accepts downstream calls from cf.js as defined by [this spec](https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#public-methods)
      - For installed apps
        - Params:
          - `event: string`
            - The ID of the AppInstance
          - `data: any`
      - For apps about to be installed:
        - Params:
          - `event: proposeInstall`
          - `data: any`

### Interfaces for Dependency Injections

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
