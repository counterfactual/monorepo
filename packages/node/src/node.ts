import {
  AppInstanceInfo,
  Node as NodeTypes
} from "@counterfactual/common-types";
import EventEmitter from "eventemitter3";

export default class Node {
  /**
   * Because the Node receives and sends out messages based on Event type
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/src/types/node-protocol.ts#L21-L33
   * the same EventEmitter can't be used since response messages would get
   * sent to listeners expecting request messages.
   **/
  private incoming: EventEmitter;
  private outgoing: EventEmitter;

  constructor() {
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.registerListeners();
  }

  /**
   * Delegates setting up a listener to the Node's outgoing EventEmitter.
   * @param event
   * @param callback
   */
  on(event: string, callback: (res: NodeTypes.MethodResponse) => void) {
    this.outgoing.on(event, callback);
  }

  /**
   * Delegates emitting events to the Node's incoming EventEmitter.
   * @param event
   * @param req
   */
  emit(event: string, req: NodeTypes.MethodRequest) {
    this.incoming.emit(event, req);
  }

  /**
   * This sets up all the listeners for the methods the Node is expected to have
   * as described at https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#node-protocol
   *
   * The responses to these calls are the events being listened on
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/API_REFERENCE.md#events
   */
  private registerListeners() {
    this.incoming.on(
      NodeTypes.MethodName.GET_APP_INSTANCES,
      (req: NodeTypes.MethodRequest) => {
        const res: NodeTypes.MethodResponse = {
          type: req.type,
          requestId: req.requestId,
          result: this.getAppInstances()
        };
        this.outgoing.emit(req.type, res);
      }
    );
  }

  private getAppInstances(): NodeTypes.GetAppInstancesResult {
    // TODO: should return actual list of app instances when that gets
    // implemented
    return {
      appInstances: [] as AppInstanceInfo[]
    };
  }
}
