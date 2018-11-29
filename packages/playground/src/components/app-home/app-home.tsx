import { Component } from "@stencil/core";

const apps = {
  // TODO: How do we get a list of available apps?
  "0x822c045f6F5e7E8090eA820E24A5f327C4E62c96": {
    name: "High Roller",
    url: "dapps/high-roller.html",
    icon: "assets/icon/high-roller.svg"
  },
  "0xd545e82792b6EF2000908F224275ED0456Cf36FA": {
    name: "Tic-Tac-Toe",
    url: "dapps/tic-tac-toe.html",
    icon: "assets/icon/icon.png"
  }
};
@Component({
  tag: "app-home",
  styleUrl: "app-home.css",
  shadow: true
})
export class AppHome {
  render() {
    return (
      <div class="app-home">
        <apps-list apps={apps} />
      </div>
    );
  }
}
