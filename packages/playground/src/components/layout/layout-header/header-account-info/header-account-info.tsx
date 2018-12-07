import { Component, Prop } from "@stencil/core";

@Component({
  tag: "header-account-info",
  styleUrl: "header-account-info.scss",
  shadow: true
})
export class HeaderAccountInfo {
  @Prop() src: string = "";
  @Prop() header: string = "";
  @Prop() content: string = "";

  render() {
    return (
      <div class="info">
        <img class="info-img" src={this.src} />
        <div class="info-text">
          <div class="header">{this.header}</div>
          <div class="content">{this.content}</div>
        </div>
      </div>
    );
  }
}
