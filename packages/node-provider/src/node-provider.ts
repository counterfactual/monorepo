import {
  INodeProvider,
  NodeMessage,
  NodeMessageReceivedCallback,
  NodeMessageType,
  NodeProviderStatus
} from "./types";

export default class NodeProvider implements INodeProvider {
  private internalStatus: NodeProviderStatus = NodeProviderStatus.OFFLINE;

  constructor() {}

  public onMessage(callback: NodeMessageReceivedCallback) {}

  public postMessage(message: NodeMessage) {}

  public async connect(): Promise<NodeProvider> {
    return Promise.resolve(this);
  }

  public get status(): NodeProviderStatus {
    return this.internalStatus;
  }

  public on(
    messageType: NodeMessageType,
    callback: NodeMessageReceivedCallback
  ) {}

  public once(
    messageType: NodeMessageType,
    callback: NodeMessageReceivedCallback
  ) {}
}
