import { Component, Prop, State } from "@stencil/core";

@Component({
  tag: "app-game-coin",
  styleUrl: "app-game-coin.scss",
  shadow: true
})
export class AppGameCoin {
  @Prop() coins: string[][] = [];
  @Prop() delay: number = 0;
  @Prop() speed: number = 0;
  @Prop() x: number = 0;

  @State() index: number = 0;

  animating: boolean;
  set: number;

  constructor() {
    this.animating = true;
    this.set = Math.floor(Math.random() * 3);
    this.index = Math.floor(Math.random() * 3);
  }

  componentWillLoad() {
    this.switchImage();
  }

  componentDidUnload() {
    this.animating = false;
  }

  async switchImage(): Promise<void> {
    await new Promise(resolve =>
      setTimeout(resolve, 100 + Math.floor(Math.random() * 150))
    );

    this.index += 1;
    if (this.index >= Object.keys(this.coins[this.set]).length) this.index = 0;

    if (this.animating) this.switchImage();
  }

  render() {
    return (
      <img
        class="coin"
        src={this.coins[this.set][this.index]}
        style={{
          left: `${this.x}%`,
          animationDelay: `${this.delay}s`,
          animationDuration: `${this.speed}s`
        }}
      />
    );
  }
}
