import { Component, Prop } from "@stencil/core";

import { AccountState } from "../../data/account";
import { NetworkState } from "../../data/network";

declare var web3: {
  currentProvider: {
    enable: () => Promise<void>;
    selectedAddress: string;
  };
  version: {
    network: string;
  };
};

@Component({
  tag: "web3-connector",
  shadow: true
})
export class Web3Connector {
  @Prop() accountState: AccountState = {};
  @Prop() networkState: NetworkState = {};

  async componentDidLoad() {
    try {
      await web3.currentProvider.enable();
    } catch {}

    if (web3.currentProvider) {
      this.accountState.updateAccount!({
        address: web3.currentProvider.selectedAddress
      });
      this.networkState.updateNetwork!({
        network: web3.version.network,
        connected: true
      });
    } else {
      this.networkState.updateNetwork!({
        connected: false
      });
    }
  }
}
