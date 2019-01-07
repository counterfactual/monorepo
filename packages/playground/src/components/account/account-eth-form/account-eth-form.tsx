import { Component, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "account-eth-form",
  styleUrl: "account-eth-form.scss",
  shadow: true
})
export class AccountEthForm {
  @Event() submit: EventEmitter = {} as EventEmitter;
  @Prop() header: string = "";
  @Prop() button: string = "";
  @Prop() available: number = 0;
  @Prop({ mutable: true }) value: string | number = "";
  @Prop({ mutable: true }) error: string = "";

  update(event) {
    this.error = "";
    this.value = event.target.value;
  }

  handleSubmit(event) {
    this.submit.emit(event);
  }

  render() {
    return (
      <div>
        <form-container onFormSubmitted={e => this.handleSubmit(e)}>
          <form-input
            type="number"
            unit="ETH"
            value={this.value}
            error={this.error}
            min={0}
            max={this.available as number}
            step={0.0001}
            onChange={e => this.update(e)}
          >
            <div class="balance-label" slot="label">
              <div>Available Balance</div>
              <div>{this.available} ETH</div>
            </div>
          </form-input>
          <form-button onButtonPressed={e => this.handleSubmit(e)}>
            {this.button}
          </form-button>
        </form-container>
      </div>
    );
  }
}
