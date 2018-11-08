type ComponentContainer = { [index: string]: Function };

export default abstract class Component extends HTMLElement {
  protected boundAttributes: string[] = [];

  public abstract getComponentName();

  protected connectedCallback() {
    this.cacheObservedAttributes();
    this.render();
  }

  protected attributeChangedCallback(
    name: string,
    oldValue: string,
    newValue: string
  ) {
    if (!this.shadowRoot) {
      return;
    }

    this.setChildNodeValue(
      this.getBoundAttributeNode(this.shadowRoot, name),
      newValue
    );
  }

  protected getShadowDom(): ShadowRoot {
    return this.shadowRoot || this.attachShadow({ mode: "open" });
  }

  protected renderTemplate(name: string) {
    const shadowDom = this.getShadowDom();
    const document = shadowDom.ownerDocument as Document;
    const template = document.querySelector(
      `template#${name}`
    ) as HTMLTemplateElement;

    shadowDom.innerHTML = template.innerHTML;

    return shadowDom;
  }

  protected setChildNodeValue(targetElement: HTMLElement, value: string) {
    targetElement.innerText = value;
  }

  protected getBoundAttributeNode(
    shadowDom: ShadowRoot,
    attributeName: string
  ): HTMLElement {
    return shadowDom.querySelector(
      `[data-bind="${attributeName}"`
    ) as HTMLElement;
  }

  protected cacheObservedAttributes() {
    this.boundAttributes = [].concat(
      Object.getPrototypeOf(this).constructor.observedAttributes
    );
  }

  protected render() {
    const shadowDom = this.renderTemplate(this.getComponentName());
    this.boundAttributes.forEach(attribute => {
      const childNode = this.getBoundAttributeNode(shadowDom, attribute);

      if (childNode) {
        const value = this.getAttribute(attribute) as string;
        this.setChildNodeValue(childNode, value);
      }
    });
  }

  private static register(...components: Component[]) {
    components.forEach(component => {
      window.customElements.define(
        component.getComponentName(),
        component.constructor
      );
    });
  }

  static registerAll(container: ComponentContainer) {
    if ("customElements" in window) {
      Component.register(
        ...Object.keys(container).map(
          component => container[component].prototype as Component
        )
      );
    }
  }
}
