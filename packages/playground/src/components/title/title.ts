import { Component } from "../../utils";

export default class Title extends Component {
  static get observedAttributes() {
    return ["text"];
  }

  getComponentName() {
    return "playground-title";
  }
}
