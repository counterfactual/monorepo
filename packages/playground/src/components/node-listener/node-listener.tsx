import { NetworkContext } from "@counterfactual/types";
import { Component, Element, State } from "@stencil/core";

import CounterfactualNode from "../../data/counterfactual";
import FirebaseDataProvider from "../../data/firebase";
import { WidgetDialogSettings } from "../../types";

type NodeMessageHandlerCallback = (data: any) => void;
type NodeMessageResolver = { [key: string]: NodeMessageHandlerCallback };

@Component({
  tag: "node-listener",
  shadow: true
})
export class NodeListener {
  @State() private currentMessage: any;

  @State() private modals: {
    [key: string]: (message: any) => WidgetDialogSettings;
  } = {
    proposeInstallVirtualEvent: message => ({
      title: "Game invitation received",
      content: (
        <main>
          <h3>{message.from} is inviting you to play!</h3>
          <label>
            You'll need to deposit{" "}
            <strong>
              {ethers.utils.formatEther(message.data.params.myDeposit)} ETH{" "}
            </strong>
            to play <strong>{message.data.params.appId}</strong> with{" "}
            <strong>{message.from}</strong>.
          </label>
          <p>Do you wish to proceed?</p>
        </main>
      ),
      primaryButtonText: "Accept",
      secondaryButtonText: "Reject",
      onPrimaryButtonClicked: this.acceptProposeInstall.bind(this),
      onSecondaryButtonClicked: this.rejectProposeInstall.bind(this)
    })
  };

  private nodeMessageResolver: NodeMessageResolver = {
    proposeInstallVirtualEvent: this.onProposeInstallVirtual.bind(this),
    rejectInstallEvent: this.onRejectInstall.bind(this)
  };

  @State() private modalVisible: boolean = false;
  @State() private modalData: WidgetDialogSettings = {} as WidgetDialogSettings;

  get node() {
    return CounterfactualNode.getInstance();
  }

  async componentWillLoad() {
    // TODO: This is a dummy firebase data provider.
    // TODO: This configuration should come from the backend.
    const serviceProvider = new FirebaseDataProvider({
      apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
      authDomain: "foobar-91a31.firebaseapp.com",
      databaseURL: "https://foobar-91a31.firebaseio.com",
      projectId: "foobar-91a31",
      storageBucket: "foobar-91a31.appspot.com",
      messagingSenderId: "432199632441"
    });

    const messagingService = serviceProvider.createMessagingService(
      "messaging"
    );
    const storeService = {
      async get(key: string): Promise<any> {
        return JSON.parse(window.localStorage.getItem(key) as string);
      },
      async set(
        pairs: {
          key: string;
          value: any;
        }[]
      ): Promise<boolean> {
        pairs.forEach(({ key, value }) => {
          window.localStorage.setItem(key, JSON.stringify(value) as string);
        });
        return true;
      }
    };

    const addressZero = "0x0000000000000000000000000000000000000000";
    const networkContext: NetworkContext = {
      AppRegistry: addressZero,
      ETHBalanceRefund: addressZero,
      ETHBucket: addressZero,
      MultiSend: addressZero,
      NonceRegistry: addressZero,
      StateChannelTransaction: addressZero,
      ETHVirtualAppAgreement: addressZero
    };

    await CounterfactualNode.create({
      messagingService,
      storeService,
      networkContext,
      nodeConfig: {
        STORE_KEY_PREFIX: "store"
      }
    });
  }

  componentDidLoad() {
    this.bindNodeEvents();
  }

  bindNodeEvents() {
    Object.keys(this.nodeMessageResolver).forEach(methodName => {
      this.node.on(methodName, this.nodeMessageResolver[methodName].bind(this));
    });
  }

  onProposeInstallVirtual(data) {
    this.currentMessage = data;
    console.log(this.currentMessage);
    this.showModal();
  }

  acceptProposeInstall() {
    this.hideModal();
  }

  rejectProposeInstall() {
    this.hideModal();
  }

  onRejectInstall(data) {}

  showModal() {
    this.modalVisible = true;
    this.modalData = this.modals[this.currentMessage.event](
      this.currentMessage
    );
  }

  hideModal() {
    this.modalVisible = false;
  }

  render() {
    return (
      <widget-dialog
        visible={this.modalVisible}
        icon={this.modalData.icon}
        dialogTitle={this.modalData.title}
        content={this.modalData.content}
        primaryButtonText={this.modalData.primaryButtonText}
        secondaryButtonText={this.modalData.secondaryButtonText}
        onPrimaryButtonClicked={this.modalData.onPrimaryButtonClicked}
        onSecondaryButtonClicked={this.modalData.onSecondaryButtonClicked}
      />
    );
  }
}
