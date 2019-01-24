import { Component, Element, Prop } from "@stencil/core";

import AccountTunnel from "../../../data/account";
import { ErrorMessage } from "../../../types";

@Component({
  tag: "widget-error-message",
  styleUrl: "widget-error-message.scss",
  shadow: true
})
export class WidgetErrorMessage {
  @Element() el!: HTMLStencilElement;
  @Prop() error: ErrorMessage = {} as ErrorMessage;

  render() {
    return this.error ? (
      <widget-tooltip message={this.error.secondary}>
        <div class="widget-error-message">{this.error.primary}</div>
      </widget-tooltip>
    ) : (
      undefined
    );
  }
}

AccountTunnel.injectProps(WidgetErrorMessage, ["error"]);