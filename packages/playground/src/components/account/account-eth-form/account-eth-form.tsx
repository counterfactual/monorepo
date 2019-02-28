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
  @Prop() max: number = 1;
  @Prop() available: BigNumber = { _hex: "0x00" } as BigNumber;
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
            max={Math.min(
              parseInt(ethers.utils.formatEther(this.available), 10),
              this.max
            )}
            step={0.001}
            onChange={e => this.update(e)}
          >
            <div class="balance-label" slot="label">
              <div>Available Balance</div>
              <div>
                {ethers.utils.formatEther(this.available).slice(0, 5)} ETH
              </div>
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
