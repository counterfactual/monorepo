import { Component } from "@stencil/core";

@Component({
  tag: "app-footer",
  styleUrl: "app-footer.scss",
  shadow: true
})
export class AppFooter {
  render() {
    return (
      <footer class="footer">
        <span>Made with </span>{" "}
        <img src="/assets/icon/ethereum.svg" alt="Ethereum" />{" "}
        <span>across the world</span>
      </footer>
    );
  }
}
