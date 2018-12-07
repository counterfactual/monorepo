import { Address, Node as NodeTypes } from "@counterfactual/common-types";
import { ethers } from "ethers";
import EventEmitter from "eventemitter3";

import { Channels } from "./channels";
import { MethodHandler } from "./methods";
import { IMessagingService, IStoreService } from "./service-interfaces";

export interface NodeConfig {
  MULTISIG_KEY_PREFIX: string;
}

export class Node {
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

  private readonly channels: Channels;
  private readonly signer: ethers.utils.SigningKey;

  /**
   * @param privateKey
   * @param messagingService
   */
  constructor(
    privateKey: string,
    private readonly messagingService: IMessagingService,
    private readonly storeService: IStoreService,
    nodeConfig: NodeConfig
  ) {
    this.signer = new ethers.utils.SigningKey(privateKey);
    this.incoming = new EventEmitter();
    this.outgoing = new EventEmitter();
    this.channels = new Channels(
      this.signer.address,
      this.storeService,
      nodeConfig.MULTISIG_KEY_PREFIX
    );
    this.registerMessagingConnection();
    new MethodHandler(this.incoming, this.outgoing, this.channels);
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
  emit(event: string, req: NodeTypes.MethodRequest) {
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
    const modifiedMsg = { from: this.address, ...msg };
    await this.messagingService.send(peerAddress, modifiedMsg);
  }

  // Note: The following getter/setter method will become private
  // once the machine becomes embedded in the Node.
  /**
   * Retrieves the value that's mapped to the given key through the provided
   * When the given key doesn't map to any value, `null` is returned.
   * store service.
   * @param key
   */
  async get(key: string): Promise<any> {
    return await this.storeService.get(key);
  }

  /**
   * Sets the given value to the given key through the provided store service.
   * @param key
   * @param value
   */
  async set(key: string, value: any): Promise<any> {
    return await this.storeService.set(key, value);
  }

  /**
   * When a Node is first instantiated, it establishes a connection
   * with the messaging service.
   */
  private registerMessagingConnection() {
    this.messagingService.receive(this.address, (msg: object) => {
      console.debug(
        `Node with address ${this.address} received message: ${JSON.stringify(
          msg
        )}`
      );
      this.outgoing.emit(Node.PEER_MESSAGE, msg);
    });
  }
}
