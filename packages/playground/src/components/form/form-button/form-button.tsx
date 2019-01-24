import { Component, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "form-button",
  styleUrl: "form-button.scss",
  shadow: true
})
export class FormButton {
  @Event() buttonPressed: EventEmitter = {} as EventEmitter;
  @Prop() disabled: boolean = false;

  handleClick(e) {
    e.preventDefault();

    this.buttonPressed.emit(e);
  }

  render() {
    return (
      <button disabled={this.disabled} onClick={this.handleClick.bind(this)} class="button">
        <slot />
      </button>
    );
  }
}
