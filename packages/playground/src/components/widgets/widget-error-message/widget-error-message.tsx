import { Component, Prop } from "@stencil/core";
import { ErrorMessage } from "../../../types";

@Component({
  tag: "widget-error-message",
  styleUrl: "widget-error-message.scss",
  shadow: true
})
export class WidgetErrorMessage {
  @Prop() error: ErrorMessage = {} as ErrorMessage;

  render() {
    return this.error.primary ? (
      <widget-tooltip message={this.error.secondary}>
        <div class="widget-error-message">
          {this.error.primary}
        </div>
      </widget-tooltip>
    ) : undefined;
  }
}
