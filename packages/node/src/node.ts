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
   * The event that Node consumers can listen on for messages from other
   * nodes.
   */
  public static PEER_MESSAGE = "peerMessage";

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
    private readonly firebase: firebase.database.Database
  ) {
    this.signer = new ethers.utils.SigningKey(privateKey);
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.registerListeners();
    this.registerConnection(firebase);
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

  get address() {
    return this.signer.address;
  }

  /**
   * @param peerAddress The peer to whom the message is being sent.
   * @param msg The message that is being sent.
   */
  async send(peerAddress: Address, msg: object) {
    await this.firebase.ref(`${MESSAGES}/${peerAddress}`).set(msg);
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

  /**
   * When a Node is first instantiated, it establishes a connection
   * with firebase.
   * @param firebase
   */
  private registerConnection(firebase: firebase.database.Database) {
    if (!this.firebase.app) {
      console.info(
        "Cannot register Node with an uninitialized firebase handle"
      );
      return;
    }

    const ref = `${MESSAGES}/${this.address}`;
    this.firebase
      .ref(ref)
      .on("value", (msg: firebase.database.DataSnapshot | null) => {
        this.outgoing.emit(Node.PEER_MESSAGE, msg!.val());
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
