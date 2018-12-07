import { Component, Event, EventEmitter } from "@stencil/core";

@Component({
  tag: "form-container",
  styleUrl: "form-container.scss",
  shadow: true
})
export class FormContainer {
  @Event() formSubmitted: EventEmitter = {} as EventEmitter;

  handleSubmit(e) {
    e.preventDefault();

    this.formSubmitted.emit(e);
  }

  render() {
    return (
      <form onSubmit={e => this.handleSubmit(e)}>
        <slot />

        <button class="button">
          <slot name="button" />
        </button>
      </form>
    );
  }
}
