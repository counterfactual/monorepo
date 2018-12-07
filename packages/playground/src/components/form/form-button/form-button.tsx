import { Component, Event, EventEmitter } from "@stencil/core";

@Component({
  tag: "form-button",
  styleUrl: "form-button.scss",
  shadow: true
})
export class FormButton {
  @Event() buttonPressed: EventEmitter = {} as EventEmitter;

  handleClick(e) {
    e.preventDefault();

    this.buttonPressed.emit(e);
  }

  render() {
    return (
      <button onClick={this.handleClick.bind(this)} class="button">
        <slot />
      </button>
    );
  }
}
