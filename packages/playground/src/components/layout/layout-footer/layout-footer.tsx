import { Component } from "@stencil/core";

@Component({
  tag: "layout-footer",
  styleUrl: "layout-footer.scss",
  shadow: true
})
export class LayoutFooter {
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
