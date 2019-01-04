import { Component, Prop, State } from "@stencil/core";

const coinSets = [
  ["02", "11", "12", "06"],
  ["10", "07", "04", "07"],
  ["03", "09", "08", "02"]
];

@Component({
  tag: "app-game-coin",
  styleUrl: "app-game-coin.scss",
  shadow: true
})
export class AppGameCoin {
  @Prop() delay: number = 0;
  @Prop() speed: number = 0;
  @Prop() x: number = 0;

  @State() image: string = "01";

  animating: boolean;
  set: number;
  index: number;

  constructor() {
    this.animating = true;
    this.set = Math.floor(Math.random() * 3);
    this.index = Math.floor(Math.random() * coinSets[this.set].length);
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

    if (!this.animating) return;

    this.index += 1;
    if (this.index >= coinSets[this.set].length) this.index = 0;
    this.image = coinSets[this.set][this.index];

    this.switchImage();
  }

  render() {
    return (
      <img
        class="coin"
        src={`./assets/images/coins/${this.image}.png`}
        style={{
          left: `${this.x}%`,
          animationDelay: `${this.delay}s`,
          animationDuration: `${this.speed}s`
        }}
      />
    );
  }
}
