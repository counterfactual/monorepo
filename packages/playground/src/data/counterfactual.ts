import { IMessagingService, IStoreService } from "@counterfactual/node";
import { NetworkContext, Node as NodeTypes } from "@counterfactual/types";

// This is a mimic type declaration of the Node, used locally to prevent
// Stencil from blowing up due to "member not exported" errors.
// It's derived from `node.d.ts`.
export declare class Node {
  static create(
    messagingService: IMessagingService,
    storeService: IStoreService,
    networkContext: NetworkContext,
    nodeConfig: NodeConfig,
    // @ts-ignore
    provider: ethers.providers.Provider
  ): Promise<Node>;
  readonly address: string;
  on(event: string, callback: (res: any) => void): void;
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
  private static node: Node;

  static getInstance(): Node {
    return CounterfactualNode.node;
  }

  static async create(settings: {
    messagingService: IMessagingService;
    storeService: IStoreService;
    networkContext: NetworkContext;
    nodeConfig: { STORE_KEY_PREFIX: string };
  }): Promise<Node> {
    CounterfactualNode.node = await Node.create(
      settings.messagingService,
      settings.storeService,
      settings.networkContext,
      settings.nodeConfig,
      // @ts-ignore
      new ethers.providers.Web3Provider(web3.currentProvider)
    );

    return CounterfactualNode.getInstance();
  }
}
