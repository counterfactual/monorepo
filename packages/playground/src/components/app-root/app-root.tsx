import { Component, State } from "@stencil/core";
import ModalTunnel, { ModalState } from '../../data/modal';

// @ts-ignore
// Needed due to https://github.com/ionic-team/stencil-router/issues/62
import { MatchResults } from "@stencil/router";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  @State() drawerOpened: boolean = false;
  @State() modal: string = "";

  closeDrawerHandler(e) {
    this.drawerOpened = false;
  }

  openDrawerHandler(e) {
    this.drawerOpened = true;
  }

  setModal(modal: string) {
    this.modal = modal;
  }

  render() {
    const tunnelState: ModalState = {
      modal: this.modal,
      setModal: this.setModal.bind(this)
    };

    return (
      <ModalTunnel.Provider state={tunnelState}>
        <div class="app-root wrapper">
          <app-drawer
            opened={this.drawerOpened}
            onCloseDrawer={e => this.closeDrawerHandler(e)}
          />
          <app-header onOpenDrawer={e => this.openDrawerHandler(e)} />

          <main class="wrapper__content">
            <stencil-router>
              <stencil-route-switch scrollTopOffset={0}>
                <stencil-route url="/" component="app-home" exact={true} />
                <stencil-route url="/dapp/:dappName" component="dapp-container" />
              </stencil-route-switch>
            </stencil-router>
          </main>

          <app-footer />
        </div>
        <app-modal-switch currentComponent={this.modal}>
          <app-modal component="auth-login"></app-modal>
          <app-modal component="auth-register"></app-modal>
        </app-modal-switch>
      </ModalTunnel.Provider>
    );
  }
}
