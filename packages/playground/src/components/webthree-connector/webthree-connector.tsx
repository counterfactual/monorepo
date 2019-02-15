import { Component, Prop } from "@stencil/core";

import { AccountState } from "../../data/account";
import { NetworkState } from "../../data/network";

const permittedNetworkIds = ["3"];

@Component({
  tag: "webthree-connector",
  shadow: true
})
export class Web3Connector {
  @Prop() accountState: AccountState = {} as AccountState;
  @Prop() networkState: NetworkState = {};

  getCurrentAddress() {
    return window["web3"].eth.accounts[0];
  }

  getCurrentNetwork() {
    return window["web3"].currentProvider.networkVersion;
  }

  isWeb3Detected() {
    return window["web3"] !== undefined;
  }

  isMetamask() {
    return window["web3"].isMetamask;
  }

  isUnlocked() {
    return window["web3"].eth.accounts[0] !== undefined;
  }

  isOnPermittedNetwork() {
    return permittedNetworkIds.includes(this.getCurrentNetwork());
  }

  async getCurrentNetworkState() {
    const networkState: NetworkState = {
      network: "",
      connected: false,
      metamaskUnlocked: false,
      web3Detected: this.networkState.web3Detected,
      web3Enabled: this.networkState.web3Enabled,
      networkPermitted: false,
      hasDetectedNetwork: true
    };

    networkState.metamaskUnlocked = this.isUnlocked();
    networkState.networkPermitted = this.isOnPermittedNetwork();
    networkState.network = window["web3"].currentProvider.networkVersion;

    return networkState;
  }

  async enableAccount() {
    try {
      await window["web3"].currentProvider.enable();
    } catch (e) {
      console.error(e);
    }
  }

  async componentDidLoad() {
    if (!this.isWeb3Detected()) {
      return this.networkState.updateNetwork!({
        web3Detected: false
      });
    }

    this.networkState.updateNetwork!({ web3Detected: true });

    await this.enableAccount();

    const networkState = await this.getCurrentNetworkState();

    networkState.web3Enabled = true;
    networkState.web3Detected = true;

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

    this.networkState.updateNetwork!(networkState);

    console.log(networkState);

    const interval = window.setInterval(async () => {
      const newAddress = this.getCurrentAddress();
      if (newAddress !== ethAddress) {
        this.networkState.updateNetwork!(await this.getCurrentNetworkState());
        ethAddress = newAddress;

        // Account was locked
        if (ethAddress !== undefined && newAddress === undefined) {
          clearInterval(interval);
        }
      }
    }, 1000);
  }
}
