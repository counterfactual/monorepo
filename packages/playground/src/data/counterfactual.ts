import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";

// This is a mimic type declaration of the Node, used locally to prevent
// Stencil from blowing up due to "member not exported" errors.
// It's derived from `node.d.ts`.
export declare class Node {
  static create(
    messagingService: NodeTypes.IMessagingService,
    storeService: NodeTypes.IStoreService,
    nodeConfig: NodeConfig,
    // @ts-ignore
    provider: ethers.providers.Provider,
    network: string,
    networkContext?: NetworkContext
  ): Promise<Node>;
  readonly publicIdentifier: string;
  on(event: string, callback: (res: any) => void): void;
  once(event: string, callback: (res: any) => void): void;
  off(event: string, callback?: (res: any) => void): void;
  emit(event: string, req: NodeTypes.MethodRequest): void;
  call(
    method: NodeTypes.MethodName,
    req: NodeTypes.MethodRequest
  ): Promise<NodeTypes.MethodResponse>;
}

export interface NodeConfig {
  STORE_KEY_PREFIX: string;
}

export default class CounterfactualNode {
  private static port: MessagePort;
  private static node: Node;
  // @ts-ignore
  private static nodeProvider: cfWallet.NodeProvider;
  // @ts-ignore
  private static cfProvider: cfWallet.Provider;

  static getInstance(): Node {
    return CounterfactualNode.node;
  }

  static getCfProvider() {
    return CounterfactualNode.cfProvider;
  }

  static async create(settings: {
    messagingService: NodeTypes.IMessagingService;
    storeService: NodeTypes.IStoreService;
    nodeConfig: { STORE_KEY_PREFIX: string };
    network: string;
    networkContext?: NetworkContext;
  }): Promise<Node> {
    if (CounterfactualNode.node) {
      return CounterfactualNode.node;
    }

    CounterfactualNode.node = await Node.create(
      settings.messagingService,
      settings.storeService,
      settings.nodeConfig,
      new ethers.providers.Web3Provider(window["web3"].currentProvider),
      settings.network
    );

    await this.setupNodeProvider();

    return CounterfactualNode.getInstance();
  }

  static async setupNodeProvider() {
    this.node.on(
      NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL,
      this.postToPort.bind(this)
    );
    this.node.on(
      NodeTypes.MethodName.INSTALL_VIRTUAL,
      this.postToPort.bind(this)
    );
    this.node.on(
      NodeTypes.MethodName.REJECT_INSTALL,
      this.postToPort.bind(this)
    );
    this.node.on(NodeTypes.MethodName.DEPOSIT, this.postToPort.bind(this));
    this.node.on(NodeTypes.MethodName.WITHDRAW, this.postToPort.bind(this));
    this.node.on(
      NodeTypes.MethodName.GET_FREE_BALANCE_STATE,
      this.postToPort.bind(this)
    );
    this.node.on(
      NodeTypes.EventName.CREATE_CHANNEL,
      this.postToPort.bind(this)
    );

    window.addEventListener("message", event => {
      if (event.data === "cf-node-provider:init") {
        const { port2 } = this.configureMessagePorts();
        window.postMessage("cf-node-provider:port", "*", [port2]);
      }
    });

    // @ts-ignore
    this.nodeProvider = new cfWallet.NodeProvider();
    await this.nodeProvider.connect();
    this.cfProvider = this.createCfProvider();
  }

  private static configureMessagePorts(): MessageChannel {
    const channel = new MessageChannel();

    this.port = channel.port1;
    this.port.addEventListener("message", this.relayMessage.bind(this));
    this.port.start();

    return channel;
  }

  /**
   * Echoes a message received via PostMessage through
   * the EventEmitter.
   *
   * @param event {MessageEvent}
   */
  private static relayMessage(event: MessageEvent): void {
    this.node.emit(event.data.type, event.data);
  }

  /**
   * Attempts to relay a message through the MessagePort. If the port
   * isn't available, we store the message in `this.messageQueue`
   * until the port is available.
   *
   * @param message {any}
   */
  private static postToPort(message: any): void {
    this.port.postMessage(message);
  }

  static createCfProvider() {
    // @ts-ignore
    return new cfWallet.Provider(this.nodeProvider);
  }
}
