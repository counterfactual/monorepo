import { ethers } from "ethers";
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
   * @param privateKey
   * @param messagingService
   */
  constructor(
    privateKey: string,
    private readonly messagingService: firebase.database.Database
  ) {
    this.signer = new ethers.utils.SigningKey(privateKey);
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.registerListeners();
    this.registerConnection();
  }

  /**
   * Delegates setting up a listener to the Node's outgoing EventEmitter.
   * This is also the entrypoint to listening for messages from other Nodes
   * via listening on the Node.PEER_MESSAGE event.
   * @param event
   * @param callback
   */
  on(event: string, callback: (res: any) => void) {
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
   * Sends a message to another Node. It also auto-includes the from field
   * in the message.
   * @param peerAddress The peer to whom the message is being sent.
   * @param msg The message that is being sent.
   */
  async send(peerAddress: Address, msg: object) {
    const modifiedMsg = Object.assign({ from: this.address }, msg);
    await this.messagingService
      .ref(`${MESSAGES}/${peerAddress}`)
      .set(modifiedMsg);
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
   * with the messaging service.
   */
  private registerConnection() {
    if (!this.messagingService.app) {
      console.error(
        "Cannot register a connection with an uninitialized firebase handle"
      );
      return;
    }

    this.messagingService
      .ref(`${MESSAGES}/${this.address}`)
      // The snapshot being sent to this call _might_ be null
      .on("value", (snapshot: firebase.database.DataSnapshot | null) => {
        if (snapshot === null) {
          console.debug(
            `Node with address ${this.address} received a "null" snapshot`
          );
          return;
        }
        const msg = snapshot.val();
        console.debug(
          `Node with address ${this.address} received message: ${JSON.stringify(
            msg
          )}`
        );
        this.outgoing.emit(Node.PEER_MESSAGE, msg);
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
