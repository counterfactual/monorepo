import { Component, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "form-input",
  styleUrl: "form-input.scss",
  shadow: true
})
export class FormInput {
  @Event() change: EventEmitter = {} as EventEmitter;
  @Prop() disabled: boolean = false;
  @Prop() label: string = "";
  @Prop() unit: string = "";
  @Prop() type: string = "text";
  @Prop() min: number = -Infinity;
  @Prop() max: number = Infinity;
  @Prop() step: number = 1;
  @Prop({ mutable: true }) error: string = "";
  @Prop({ mutable: true }) value: string | number = "";

  handleChange(event) {
    this.value = event.target.value;
    this.error = "";
    this.change.emit(event);
  }

  render() {
    return (
      <label>
        <div class="label">
          {this.label ? this.label : <slot name="label" />}
        </div>

        <div
          class={this.disabled ? "input-container disabled" : "input-container"}
        >
          <input
            class="input"
            disabled={this.disabled}
            type={this.type}
            value={this.value}
            max={this.max}
            min={this.min}
            step={this.step}
            onInput={event => this.handleChange(event)}
          />
          {this.unit ? <div class="unit">{this.unit}</div> : null}
        </div>
        {this.error ? <div class="error">{this.error}</div> : null}
      </label>
    );
  }
}
