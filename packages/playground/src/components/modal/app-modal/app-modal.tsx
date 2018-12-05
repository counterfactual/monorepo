import { Component, Element, Prop } from "@stencil/core";
import ModalTunnel from '../../../data/modal';

@Component({
  tag: "app-modal",
  styleUrl: "app-modal.scss",
  shadow: true
})
export class AppModal {
  @Element() el!: HTMLStencilElement;
  @Prop() component: string = "";
  @Prop() currentComponent: string = "";
  @Prop() exitable: boolean = true;

  // temp hack until this issue is fixed
  // https://github.com/ionic-team/stencil-state-tunnel/issues/5
  @Prop() setModal;

  render() {
    if (this.currentComponent === this.component) {
      const ChildComponent = this.component;
      const closeModal = () => {
        this.setModal("");
      }

      return (
        <div class="modal-container">
          <div class="modal-constraint">
            <div class="pre">
              <app-connection></app-connection>
              {this.exitable ? <button onClick={closeModal} class="close">x</button> : null}
            </div>
            <div class="content">
              <ChildComponent />
            </div>
            <div class="post">

            </div>
          </div>
        </div>
      );
    }
  }
}

ModalTunnel.injectProps(AppModal, ["setModal"]);
