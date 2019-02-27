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
  @Prop() disabled: boolean = false;
  @Prop() available: number = 0;
  @Prop() max: number = 1;
  @Prop({ mutable: true }) value: string | number = "";
  @Prop({ mutable: true }) error: string = "";

  update(event) {
    this.error = "";
    this.value = event.target.value;
  }

  handleSubmit(event) {
    event.preventDefault();

    this.submit.emit(event);
  }

  render() {
    return (
      <div>
        <form-container>
          <form-input
            type="number"
            unit="ETH"
            value={this.value}
            error={this.error}
            disabled={this.disabled}
            min={0}
            max={Math.min(this.available as number, this.max)}
            step={0.001}
            onChange={e => this.update(e)}
          >
            <div class="balance-label" slot="label">
              <div>Available Balance</div>
              <div>{this.available.toFixed(3)} ETH</div>
            </div>
          </form-input>
          <form-button
            disabled={this.disabled}
            onButtonPressed={this.handleSubmit.bind(this)}
          >
            {this.button}
          </form-button>
        </form-container>
      </div>
    );
  }
}
