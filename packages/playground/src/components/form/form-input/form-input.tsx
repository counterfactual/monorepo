import { Component, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "form-input",
  styleUrl: "form-input.scss",
  shadow: true
})
export class FormInput {
  @Event() change: EventEmitter = {} as EventEmitter;
  @Prop() label: string = "";
  @Prop() type: string = "text";
  @Prop({ mutable: true }) value: string | number = "";

  handleChange(event) {
    this.value = event.target.value;
    this.change.emit(event);
  }

  render() {
    return (
      <label>
        <div class="label">
          {this.label}
        </div>
        <input
          class="input"
          type={this.type}
          value={this.value}
          onInput={event => this.handleChange(event)}
        />
      </label>
    );
  }
}
