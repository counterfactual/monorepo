import { Component, Element, Prop, Watch } from "@stencil/core";

function isAppModalElement(element: Element): boolean {
  return element.tagName.toLocaleLowerCase() === 'app-modal';
}

@Component({
  tag: "app-modal-switch",
  styleUrl: "app-modal-switch.scss",
  shadow: true
})
export class AppModalSwitch {
  @Element() el!: HTMLStencilElement;

  @Prop() currentComponent: string = "";

  componentWillLoad() {
    if (this.currentComponent) {
     this.assignCurrentComponentToChildren(this.currentComponent);
    }
  }

  @Watch('currentComponent')
  async assignCurrentComponentToChildren(currentComponent: string) {
    const modals = Array.prototype.slice.call(this.el.children).filter(isAppModalElement);

    modals.forEach((modal) => modal.currentComponent = currentComponent);
  }

  render() {
    return (
      <slot />
    );
  }
}
