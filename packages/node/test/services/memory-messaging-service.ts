import { Node } from "@counterfactual/types";
import { EventEmitter } from "events";

export class MemoryMessagingService implements Node.IMessagingService {
  private readonly eventEmitter: EventEmitter = new EventEmitter();
  constructor() {}

  async send(to: string, msg: Node.NodeMessage): Promise<void> {
    this.eventEmitter.emit(to, msg);
  }

  onReceive(address: string, callback: (msg: Node.NodeMessage) => void) {
    this.eventEmitter.on(address, msg => {
      callback(msg);
    });
  }
}
