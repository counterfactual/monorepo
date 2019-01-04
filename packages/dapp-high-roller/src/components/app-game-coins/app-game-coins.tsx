import { Component } from "@stencil/core";

@Component({
  tag: "app-game-coins",
  styleUrl: "app-game-coins.scss",
  shadow: true
})
export class AppGameCoins {
  render() {
    const length = Math.min(
      50,
      Math.max(20, (screen.width * screen.height) / 10000)
    );

    return (
      <div class="coins">
        {Array.from({ length }).map(() => (
          <div class="coins__coin">
            <app-game-coin
              delay={Math.random() * 3}
              speed={1.5 + Math.random() * 1}
              x={-20 + Math.random() * 120}
            />
          </div>
        ))}
      </div>
    );
  }
}
