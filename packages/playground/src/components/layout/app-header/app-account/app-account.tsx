import { Component, Element, Prop } from "@stencil/core";
import ModalTunnel from '../../../../data/modal';

@Component({
  tag: "app-account",
  styleUrl: "app-account.scss",
  shadow: true
})
export class AppAccount {
  @Element() el!: HTMLStencilElement;
  @Prop() authenticated: boolean = false;

  // temp hack until this issue is fixed
  // https://github.com/ionic-team/stencil-state-tunnel/issues/5
  @Prop() setModal;

  render() {
    const openLoginModal = () => {
      this.setModal("auth-login");
    }
    const openRegisterModal = () => {
      this.setModal("auth-register");
    }

    return this.authenticated ? (
      <div class="info-container">
        <app-account-info
          src="/assets/icon/cf.png"
          header="Balance"
          content="0.1000 ETH"
        />
        <app-account-info
          src="/assets/icon/account.png"
          header="Account"
          content="username"
        />
      </div>
    ) : (
      <div class="btn-container">
        <button onClick={openLoginModal} class="btn">Login</button>
        <button onClick={openRegisterModal} class="btn btn-outline">Register</button>
      </div>
    );
  }
}

ModalTunnel.injectProps(AppAccount, ["setModal"]);