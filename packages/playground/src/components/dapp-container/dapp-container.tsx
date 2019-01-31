declare var EventEmitter: any;

import { Component, Element, Prop } from "@stencil/core";
import { MatchResults, RouterHistory } from "@stencil/router";

import AccountTunnel from "../../data/account";
import AppRegistryTunnel from "../../data/app-registry";
import CounterfactualNode from "../../data/counterfactual";
import { AppDefinition, UserSession } from "../../types";

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

  @Prop() apps: AppDefinition[] = [];

  @Prop() user: UserSession = {} as UserSession;
  @Prop() balance: string = "";

  private frameWindow: Window | null = null;
  private port: MessagePort | null = null;
  private eventEmitter: any = new EventEmitter();
  private messageQueue: object[] = [];
  private iframe: HTMLIFrameElement = {} as HTMLIFrameElement;
  private node = CounterfactualNode.getInstance();

  private $onMessage: (event: MessageEvent) => void = () => {};

  render() {
    return <layout-header />;
  }

  getDappUrl(): string {
    const dappSlug = this.match.params.dappName;
    const dapp = this.apps.find(app => app.slug === dappSlug);

    if (!dapp) {
      return "";
    }

    return dapp.url;
  }

  componentDidLoad(): void {
    this.url = this.getDappUrl();

    this.node.on("proposeInstallVirtual", this.postOrQueueMessage.bind(this));
    this.node.on("installVirtualEvent", this.postOrQueueMessage.bind(this));
    this.node.on("getAppInstanceDetails", this.postOrQueueMessage.bind(this));
    this.node.on("getState", this.postOrQueueMessage.bind(this));
    this.node.on("takeAction", this.postOrQueueMessage.bind(this));
    this.node.on("updateStateEvent", this.postOrQueueMessage.bind(this));
    this.node.on("uninstallEvent", this.postOrQueueMessage.bind(this));

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

    // Callback for setting up the MessageChannel with the NodeProvider
    window.addEventListener("message", this.$onMessage);

    // Callback for processing Playground UI messages
    window.addEventListener("message", this.handlePlaygroundMessage.bind(this));

    // Callback for passing an app instance, if available.
    iframe.addEventListener("load", this.sendAppInstance.bind(this));

    this.iframe = iframe;
  }

  componentDidUnload() {
    if (this.frameWindow) {
      this.frameWindow = null;
    }

    this.eventEmitter.off("message");

    if (this.port) {
      this.port.close();
      this.port = null;
    }

    this.iframe.remove();
  }

  private handlePlaygroundMessage(event: MessageEvent): void {
    if (!this.frameWindow) {
      return;
    }

    if (event.data === "playground:request:user") {
      const matchmakeWith = window.localStorage.getItem(
        "playground:matchmakeWith"
      ) as string;

      this.frameWindow.postMessage(
        `playground:response:user|${JSON.stringify({
          user: {
            ...this.user,
            token: window.localStorage.getItem(
              "playground:user:token"
            ) as string
          },
          balance: this.balance,
          // This devtool flag allows to force a matchmake with a given username.
          ...(matchmakeWith ? { matchmakeWith } : {})
        })}`,
        "*"
      );
    }
  }

  /**
   * Attempts to relay a message through the MessagePort. If the port
   * isn't available, we store the message in `this.messageQueue`
   * until the port is available.
   *
   * @param message {any}
   */
  public postOrQueueMessage(message: any): void {
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
      window.removeEventListener("message", this.$onMessage);
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
    this.node.emit(event.data.type, event.data);
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

  private sendAppInstance(): void {
    if (!this.frameWindow) {
      return;
    }

    const { installedApp } = this.history.location.state;

    this.frameWindow.postMessage(
      `playground:appInstance|${
        installedApp ? JSON.stringify(installedApp) : ""
      }`,
      "*"
    );
  }
}

AppRegistryTunnel.injectProps(DappContainer, ["apps"]);
AccountTunnel.injectProps(DappContainer, ["balance", "user"]);
