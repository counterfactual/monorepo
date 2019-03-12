import { Component, State } from "@stencil/core";

// coin audio attribution:
// https://freesound.org/people/Robinhood76/sounds/51671/

@Component({
  tag: "app-game-coins",
  styleUrl: "app-game-coins.scss",
  shadow: true
})
export class AppGameCoins {
  @State() coins: any;

  constructor() {
    this.preloadCoins();
  }

  async preloadCoins() {
    this.coins = await Promise.all(
      [
        ["02", "11", "12", "06"],
        ["10", "07", "04", "07"],
        ["03", "09", "08", "02"]
      ].map(set => {
        return Promise.all(
          set.map(number => {
            return new Promise(resolve => {
              const img = new Image();
              const c = document.createElement("canvas");
              const ctx = c.getContext("2d") || new CanvasRenderingContext2D();

              img.onload = function() {
                c.width = img.naturalWidth;
                c.height = img.naturalHeight;
                ctx.drawImage(img, 0, 0);

                resolve(c.toDataURL("image/png"));
              };
              img.src = `./assets/images/coins/${number}.png`;
            });
          })
        );
      })
    );
  }

  render() {
    const length = Math.min(
      50,
      Math.max(20, (screen.width * screen.height) / 10000)
    );

    return this.coins ? (
      <div class="coins">
        {Array.from({ length }).map(() => (
          <div class="coins__coin">
            <app-game-coin
              coins={this.coins}
              delay={Math.random() * 3}
              speed={1.5 + Math.random() * 1}
              x={-20 + Math.random() * 120}
            />
          </div>
        ))}
      </div>
    ) : (
      undefined
    );
  }
}
