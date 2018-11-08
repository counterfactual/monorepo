export default abstract class Component extends HTMLElement {
  public getComponentName() {
    return "my-component";
  }

  protected connectedCallback() {
    this.renderTemplate(this.getComponentName());
  }

  protected renderTemplate(name: string) {
    const shadowDom = this.attachShadow({ mode: "open" });
    const document = shadowDom.ownerDocument as Document;
    const template = document.querySelector(
      `template#${name}`
    ) as HTMLTemplateElement;

    shadowDom.innerHTML = template.innerHTML;

    return shadowDom;
  }

  protected bindAttribute(attributeName: string, targetSelector: string) {
    const shadowDom = this.shadowRoot as ShadowRoot;
    const targetElement = shadowDom.querySelector(
      targetSelector
    ) as HTMLElement;

    if (!targetElement || !this.hasAttribute(attributeName)) {
      return;
    }

    const mutationCallback = () => this.renderAttribute(attributeName, targetElement);

    const attributeObserver = new MutationObserver(mutationCallback);
    attributeObserver.observe(this, { attributes: true });

    mutationCallback();
  }

  renderAttribute(attributeName: string, targetElement: HTMLElement) {
    targetElement.innerText = this.getAttribute(attributeName) as string;
  }

  private static register(...components: Component[]) {
    if ("customElements" in window) {
      components.forEach(component => {
        window.customElements.define(
          component.getComponentName(),
          component.constructor
        );
      });
    }
  }

  static registerAll(container: { [index: string]: Function }) {
    Component.register(
      ...Object.keys(container).map(
        component => container[component].prototype as Component
      )
    );
  }
}
