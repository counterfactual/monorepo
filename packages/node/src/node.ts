import machine from "@counterfactual/machine";
import * as ethers from "ethers";
import EventEmitter from "eventemitter3";
import firebase from "firebase";

import {
  Address,
  AppInstanceInfo,
  GetAppInstancesResult,
  MethodName,
  MethodRequest,
  MethodResponse
} from "./node-types";

export default class Node {
  // @ts-ignore
  private instructionExecutor: machine.InstructionExecutor = Object.create(
    null
  );

  /**
   * Because the Node receives and sends out messages based on Event type
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/src/types/node-protocol.ts#L21-L33
   * the same EventEmitter can't be used since responses messages would get
   * sent to listeners expecting a request message.
   **/
  private incoming: EventEmitter;
  private outgoing: EventEmitter;

  constructor(
    // @ts-ignore
    private readonly privateKey: string,
    // @ts-ignore
    private readonly provider: ethers.providers.Web3Provider,
    // @ts-ignore
    private readonly firestore: firebase.firestore.Firestore,
    // @ts-ignore
    private readonly networkContext: Map<string, Address>
  ) {
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.registerListeners();
  }

  /**
   * Create a multisig for the channel with the peer specified.
   * @param peerAddress The peer to create the multisig with.
   */
  async createMultisig(peerAddress: Address): Promise<Address> {
    // TODO:
    return Promise.resolve(ethers.constants.AddressZero);
  }

  /**
   * Delegates setting up a listener to the Node's outgoing EventEmitter.
   * @param event
   * @param callback
   */
  on(event: string, callback: (res: MethodResponse) => void) {
    this.outgoing.on(event, callback);
  }

  /**
   * Delegates emitting events to the Node's incoming EventEmitter.
   * @param event
   * @param req
   */
  emit(event: string, req: MethodRequest) {
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
    this.incoming.on(MethodName.GET_APP_INSTANCES, (req: MethodRequest) => {
      // TODO: empty for now
      const res: MethodResponse = {
        type: req.type,
        requestId: req.requestId,
        result: this.getAppInstances()
      };
      this.outgoing.emit(req.type, res);
    });
  }

  private getAppInstances(): GetAppInstancesResult {
    return {
      appInstances: [] as AppInstanceInfo[]
    };
  }
}
