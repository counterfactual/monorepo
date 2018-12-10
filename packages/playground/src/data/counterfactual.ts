import { IMessagingService, IStoreService } from "@counterfactual/node";

import { Address, Node as NodeTypes } from "@counterfactual/common-types";

// This is a mimic type declaration of the Node, used locally to prevent
// Stencil from blowing up due to "member not exported" errors.
// It's derived from `node.d.ts`.
declare class Node {
  constructor(
    privateKey: string,
    messagingService: IMessagingService,
    storeService: IStoreService
  );
  on(event: string, callback: (res: any) => void): void;
  emit(event: string, req: NodeTypes.MethodRequest): void;
  readonly address: string;
  send(peerAddress: Address, msg: object): Promise<void>;
  get(key: string): Promise<any>;
  set(key: string, value: any): Promise<any>;
}

let node: Node;

export default class CounterfactualNode {
  static getInstance(): Node {
    return node;
  }

  static create(settings: {
    privateKey: string;
    messagingService: IMessagingService;
    storeService: IStoreService;
  }): Node {
    node = new Node(
      settings.privateKey,
      settings.messagingService,
      settings.storeService
    );

    return CounterfactualNode.getInstance();
  }
}
