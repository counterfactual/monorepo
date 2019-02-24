import { Component, Prop } from "@stencil/core";

import { AccountState } from "../../data/account";
import { WalletState } from "../../data/wallet";

const permittedNetworkIds = ["3"];

@Component({
  tag: "webthree-connector",
  shadow: true
})
export class Web3Connector {
  @Prop() accountState: AccountState = {} as AccountState;
  @Prop() walletState: WalletState = {};

  getCurrentAddress() {
    return window["web3"].eth.accounts[0];
  }

  getCurrentNetwork() {
    return window["web3"].version.network;
  }

  isWeb3Detected() {
    return window["web3"] !== undefined;
  }

  isMetamask() {
    return (
      window["web3"].isMetamask || window["web3"].currentProvider.isMetamask
    );
  }

  isUnlocked() {
    return window["web3"].eth.accounts[0] !== undefined;
  }

  isOnPermittedNetwork() {
    return permittedNetworkIds.includes(this.getCurrentNetwork());
  }

  async getCurrentWalletState() {
    const walletState: WalletState = {
      network: "",
      connected: false,
      metamaskUnlocked: false,
      web3Detected: this.walletState.web3Detected,
      web3Enabled: this.walletState.web3Enabled,
      networkPermitted: false,
      hasDetectedNetwork: true
    };

    walletState.metamaskUnlocked = this.isUnlocked();
    walletState.networkPermitted = this.isOnPermittedNetwork();
    walletState.network = this.getCurrentNetwork();

    return walletState;
  }

  async componentDidLoad() {
    if (!this.isWeb3Detected()) {
      return this.walletState.updateNetwork!({
        web3Detected: false,
        hasDetectedNetwork: true
      });
    }

    this.walletState.updateNetwork!({ web3Detected: true });

    const walletState = await this.getCurrentWalletState();

    walletState.web3Enabled = true;
    walletState.web3Detected = true;

    const provider = new ethers.providers.Web3Provider(web3.currentProvider);
    let ethAddress = this.getCurrentAddress();
    const signer = provider.getSigner();

    // TODO: find more robust way to work with coinbase;
    // currently it does not yet support "web3.currentProvider.selectedAddress"

    this.accountState.updateAccount!({
      provider,
      signer,
      user: {
        ...this.accountState.user,
        ethAddress
      },
      balance: 0,
      accountBalance: 0
    });

    this.walletState.updateNetwork!(walletState);

    const interval = window.setInterval(async () => {
      const newAddress = this.getCurrentAddress();

      await this.accountState.updateAccount!({
        ...this.accountState,
        user: { ...this.accountState.user, ethAddress: newAddress }
      });

      if (newAddress !== ethAddress) {
        this.walletState.updateNetwork!(await this.getCurrentWalletState());
        ethAddress = newAddress;

        // Account was locked
        if (ethAddress !== undefined && newAddress === undefined) {
          clearInterval(interval);
        }
      }
    }, 1000);
  }
}
