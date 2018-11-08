import { Component } from "../../utils";

export default class Title extends Component {
  getComponentName() {
    return "playground-title";
  }

  connectedCallback() {
    super.connectedCallback();
    this.bindAttribute("text", ".playground-title");
  }
}
