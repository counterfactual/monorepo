import { Component, Element, Prop } from "@stencil/core";
import EventEmitter from "eventemitter3";

@Component({
  tag: "dapp-container",
  shadow: true
})
export class DappContainer {
  @Element() private element: HTMLElement | undefined;
  @Prop() url: string = "";

  private frameWindow: Window | null = null;
  private port: MessagePort | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private messageQueue: object[] = [];

  constructor() {
    this.eventEmitter.on("message", this.postOrQueueMessage.bind(this));
  }

  componentDidLoad() {
    /**
     * Once the component has loaded, we store a reference of the IFRAME
     * element's window so we can bind the message relay system.
     **/
    const element = this.element as HTMLElement;
    const iframe = element.querySelector("iframe") as HTMLIFrameElement;

    this.frameWindow = iframe.contentWindow as Window;
    this.frameWindow.addEventListener(
      "message",
      this.configureMessageChannel.bind(this)
    );
  }

  /**
   * Attempts to relay a message through the MessagePort. If the port
   * isn't available, we store the message in `this.messageQueue`
   * until the port is available.
   *
   * @param message {any}
   */
  private postOrQueueMessage(message: any) {
    if (this.port) {
      this.port.postMessage(message);
    } else {
      this.queueMessage(message);
    }
  }

  /**
   * Binds the port with the MessageChannel created for this dApp
   * by responding to NodeProvider configuration messages.
   *
   * @param event {MessageEvent}
   */
  private configureMessageChannel(event: MessageEvent) {
    if (!this.frameWindow) {
      return;
    }

    if (event.data === "cf-node-provider:init") {
      const { port2 } = this.configureMessagePorts();
      this.frameWindow.postMessage("cf-node-provider:port", "*", [port2]);
    }

    if (event.data === "cf-node-provider:ready") {
      this.flushMessageQueue();
    }
  }

  /**
   * Binds this end of the MessageChannel (aka `port1`) to the dApp
   * container, and attachs a listener to relay messages via the
   * EventEmitter.
   */
  private configureMessagePorts() {
    const channel = new MessageChannel();

    this.port = channel.port1;
    this.port.addEventListener("message", this.relayMessage.bind(this));
    this.port.start();

    return channel;
  }

  /**
   * Echoes a message received via PostMessage through
   * the EventEmitter.
   *
   * @param event {MessageEvent}
   */
  private relayMessage(event) {
    this.eventEmitter.emit("message", event.data);
  }

  /**
   * Echoes a message received via PostMessage through
   * the EventEmitter.
   *
   * @param event {MessageEvent}
   */
  private queueMessage(message) {
    this.messageQueue.push(message);
  }

  /**
   * Clears the message queue and forwards any messages
   * stored there through the MessagePort.
   */
  private flushMessageQueue() {
    if (!this.port) {
      return;
    }

    let message;
    while ((message = this.messageQueue.shift())) {
      this.port.postMessage(message);
    }
  }

  render() {
    // tslint:disable-next-line:prettier
    return <iframe src={this.url}></iframe>;
  }
}
