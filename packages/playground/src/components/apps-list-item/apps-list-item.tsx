import { Component, Prop } from "@stencil/core";

@Component({
  tag: "apps-list-item",
  styleUrl: "apps-list-item.scss",
  shadow: true
})
export class AppsListItem {
  @Prop() icon: string = "";
  @Prop() name: string = "";
  @Prop() notifications: number | null = null;
  @Prop() url: string = "";

  render() {
    return (
      <li class="item">
        <a href={this.url}>
          <div class="icon">
            {this.notifications ? (
              <div class="notification">{this.notifications}</div>
            ) : null}
            <img src={this.icon} alt={this.name} />
          </div>
          <span class="name">{this.name}</span>
        </a>
      </li>
    );
  }
}
