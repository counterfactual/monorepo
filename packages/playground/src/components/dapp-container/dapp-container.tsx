import { Component, Element, Prop } from "@stencil/core";
import { MatchResults, RouterHistory } from "@stencil/router";
import EventEmitter from "eventemitter3";

import apps from "../../utils/app-list";

@Component({
  tag: "dapp-container",
  styleUrl: "dapp-container.scss",
  shadow: true
})
export class DappContainer {
  @Element() private element: HTMLElement | undefined;

  @Prop() match: MatchResults = {} as MatchResults;
  @Prop() history: RouterHistory = {} as RouterHistory;

  @Prop({ mutable: true }) url: string = "";

  private frameWindow: Window | null = null;
  private port: MessagePort | null = null;
  private eventEmitter: EventEmitter = new EventEmitter();
  private messageQueue: object[] = [];
  private iframe: HTMLIFrameElement = {} as HTMLIFrameElement;

  private $onMessage: EventListenerObject = {} as EventListenerObject;

  render() {
    return <app-nav history={this.history} />;
  }

  getDappUrl(): string {
    const dappSlug = this.match.params.dappName;
    for (const address in apps) {
      if (dappSlug === apps[address].slug) {
        return apps[address].url;
      }
    }

    return "";
  }

  componentDidLoad(): void {
    this.eventEmitter.on("message", this.postOrQueueMessage.bind(this));
    this.url = this.getDappUrl();

    /**
     * Once the component has loaded, we store a reference of the IFRAME
     * element's window so we can bind the message relay system.
     **/
    const element = (this.element as HTMLElement).shadowRoot as ShadowRoot;
    const iframe = document.createElement("iframe");
    iframe.src = this.url;
    element.appendChild(iframe);

    this.frameWindow = iframe.contentWindow as Window;
    this.$onMessage = this.configureMessageChannel.bind(this);

    // TODO: This won't work if the dapp is in a different host.
    // We need to think a way of exchanging messages to make this
    // possible.
    this.frameWindow.addEventListener("message", this.$onMessage);

    this.iframe = iframe;
  }

  componentDidUnload() {
    if (this.frameWindow) {
      this.frameWindow.removeEventListener("message", this.$onMessage);
      this.frameWindow = null;
    }

    this.eventEmitter.off("message");

    if (this.port) {
      this.port.close();
      this.port = null;
    }

    this.iframe.remove();
  }

  /**
   * Attempts to relay a message through the MessagePort. If the port
   * isn't available, we store the message in `this.messageQueue`
   * until the port is available.
   *
   * @param message {any}
   */
  private postOrQueueMessage(message: any): void {
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
  private configureMessageChannel(event: MessageEvent): void {
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
  private configureMessagePorts(): MessageChannel {
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
  private relayMessage(event: MessageEvent): void {
    this.eventEmitter.emit("message", event.data);
  }

  /**
   * Echoes a message received via PostMessage through
   * the EventEmitter.
   *
   * @param event {MessageEvent}
   */
  private queueMessage(message): void {
    this.messageQueue.push(message);
  }

  /**
   * Clears the message queue and forwards any messages
   * stored there through the MessagePort.
   */
  private flushMessageQueue(): void {
    if (!this.port) {
      return;
    }

    let message;
    while ((message = this.messageQueue.shift())) {
      this.port.postMessage(message);
    }
  }
}
