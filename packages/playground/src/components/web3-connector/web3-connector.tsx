import { Component, Prop } from "@stencil/core";

import { AccountState } from "../../data/account";
import { NetworkState } from "../../data/network";

@Component({
  tag: "web3-connector",
  shadow: true
})
export class Web3Connector {
  @Prop() accountState: AccountState = {} as AccountState;
  @Prop() networkState: NetworkState = {};

  async componentDidLoad() {
    try {
      await web3.currentProvider.enable();
    } catch {}

    if (web3.currentProvider) {
      const provider = new ethers.providers.Web3Provider(web3.currentProvider);
      const signer = provider.getSigner();
      const ethAddress = web3.currentProvider.selectedAddress;

      this.accountState.updateAccount!({
        provider,
        signer,
        user: {
          ethAddress,
          username: "",
          multisigAddress: "",
          id: "",
          email: "",
          nodeAddress: ""
        },
        balance: 0,
        accountBalance: 0
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
