import { Component, Prop } from "@stencil/core";
import { Web3Provider } from "ethers/providers";

import { AccountState } from "../../data/account";
import { WalletState } from "../../data/wallet";

const KOVAN_NETWORK_ID = "42";

const permittedNetworkIds = [KOVAN_NETWORK_ID];

@Component({
  tag: "webthree-connector",
  shadow: true
})
export class Web3Connector {
  @Prop() accountState: AccountState = {} as AccountState;
  @Prop() walletState: WalletState = {};

  getProvider(): Web3Provider {
    return new window["ethers"].providers.Web3Provider(
      window["web3"].currentProvider
    );
  }

  getCurrentAddress() {
    return window["web3"].eth.accounts[0];
  }

  getCurrentNetwork() {
    return window["web3"].version.network;
  }

  async getETHBalance() {
    const provider = this.getProvider();

    if (provider && this.isUnlocked()) {
      return await provider.getSigner().getBalance();
    }

    return window["ethers"].constants.Zero;
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
      return this.walletState.updateWalletConnection!({
        web3Detected: false,
        hasDetectedNetwork: true
      });
    }

    this.accountState.updateAccount!({
      user: {
        ...this.accountState.user,
        ethAddress: this.getCurrentAddress()
      }
    });

    this.walletState.updateWalletConnection!({
      ...(await this.getCurrentWalletState()),
      provider: this.getProvider(),
      signer: this.getProvider().getSigner(),
      web3Enabled: true,
      web3Detected: true
    });

    const interval = window.setInterval(async () => {
      let ethAddress = this.accountState.user.ethAddress;
      const newAddress = this.getCurrentAddress();

      await this.accountState.updateAccount!({
        user: { ...this.accountState.user, ethAddress: newAddress }
      });

      await this.walletState.updateWalletConnection!({
        ethWeb3WalletBalance: await this.getETHBalance()
      });

      if (newAddress !== ethAddress) {
        this.walletState.updateWalletConnection!(
          await this.getCurrentWalletState()
        );

        ethAddress = newAddress;

        // Account was locked
        if (ethAddress !== undefined && newAddress === undefined) {
          clearInterval(interval);
        }
      }
    }, 1000);
  }
}
