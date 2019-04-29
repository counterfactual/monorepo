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
  @Prop() provideFaucetLink: boolean = false;
  @Prop() min: number = 0.01;
  @Prop() max: number = 1;
  @Prop() available: BigNumber | number = 0;
  @Prop({ mutable: true }) value: string | number = "";
  @Prop({ mutable: true }) error: string = "";
  @Prop() loading: boolean = false;
  @Prop() autofocus: boolean = false;

  update(event) {
    this.error = "";
    this.value = event.target.value;
  }

  openFaucet() {
    window.open("https://faucet.kovan.network/", "_blank");
  }

  handleSubmit(event) {
    event.preventDefault();

    const value = Number(this.value);

    if (!value || value < this.min || value > this.max) {
      this.error = `Enter an amount larger than ${this.min} and smaller than ${
        this.max
      }.`;
      return;
    }

    this.submit.emit(event);
  }

  render() {
    let formattedEth;

    try {
      formattedEth = parseFloat(
        ethers.utils.formatEther(this.available)
      ).toFixed(4);
    } catch {
      formattedEth = "0";
    }

    return (
      <div>
        <form-container>
          <form-input
            type="number"
            unit="ETH"
            value={this.value}
            error={this.error}
            disabled={this.disabled}
            min={this.min}
            max={Math.min(parseInt(formattedEth, 10), this.max)}
            step={0.001}
            onChange={e => this.update(e)}
            autofocus={this.autofocus}
          >
            <div class="balance-label" slot="label">
              <div>Available Balance</div>
              <div>{formattedEth} ETH</div>
            </div>
          </form-input>
          <form-button
            class="button"
            spinner={this.loading}
            disabled={this.disabled}
            onButtonPressed={this.handleSubmit.bind(this)}
          >
            {this.button}
          </form-button>

          {this.provideFaucetLink ? (
            <form-button
              class="button button--secondary"
              onButtonPressed={this.openFaucet.bind(this)}
            >
              Get Free ETH (test faucet)
            </form-button>
          ) : (
            undefined
          )}
        </form-container>
      </div>
    );
  }
}
