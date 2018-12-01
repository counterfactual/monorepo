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

const MESSAGES = "messages";

export default class Node {
  /**
   * Because the Node receives and sends out messages based on Event type
   * https://github.com/counterfactual/monorepo/blob/master/packages/cf.js/src/types/node-protocol.ts#L21-L33
   * the same EventEmitter can't be used since response messages would get
   * sent to listeners expecting request messages.
   **/
  private readonly incoming: EventEmitter;
  private readonly outgoing: EventEmitter;
  private readonly signer: ethers.utils.SigningKey;

  /**
   *
   * @param privateKey
   * @param firestore This firestore is used both as the messaging service
   * and the storage service.
   */
  constructor(
    privateKey: string,
    private readonly firestore: firebase.firestore.Firestore
  ) {
    this.signer = new ethers.utils.SigningKey(privateKey);
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.registerListeners();
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
   * This uses the peerAddress along with the sender's address to establish
   * a channel ID that the parties can communicate through.
   * TODO: use the multisig address as the channel ID when create multisig
   * has been implemented
   * @param peerAddress The peer to whom the message is being sent.
   * @param msg The message that is being sent.
   */
  send(peerAddress: Address, msg: any) {
    const channelID = `${peerAddress}_${this.signer.address}`;
    this.firestore
      .collection(MESSAGES)
      .doc(channelID)
      .set(msg);
  }

  receive(peerAddress: Address, callback: (msg: any) => void) {
    const channelID = `${this.signer.address}_${peerAddress}`;
    this.firestore
      .collection(MESSAGES)
      .doc(channelID)
      .onSnapshot(doc => {
        console.log(`Got message from ${peerAddress}`);
      });
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
      const res: MethodResponse = {
        type: req.type,
        requestId: req.requestId,
        result: this.getAppInstances()
      };
      this.outgoing.emit(req.type, res);
    });
  }

  private getAppInstances(): GetAppInstancesResult {
    // TODO: should return actual list of app instances when that gets
    // implemented
    return {
      appInstances: [] as AppInstanceInfo[]
    };
  }
}
