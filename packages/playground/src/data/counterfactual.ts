declare class Node {
  constructor(privateKey: string, messagingService: any, storeService: any);
  on(event: string, callback: (res: any) => void): void;
  emit(event: string, req: any): void;
}

let node;

export default class CounterfactualNode {
  static getInstance(): Node {
    return node;
  }

  static create(settings): Node {
    node = new Node(
      settings.privateKey,
      settings.messagingService,
      settings.storeService
    );

    return CounterfactualNode.getInstance();
  }
}
