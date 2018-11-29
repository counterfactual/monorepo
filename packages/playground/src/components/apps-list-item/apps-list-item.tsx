import { Component, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "apps-list-item",
  styleUrl: "apps-list-item.css",
  shadow: true
})
export class AppsListItem {
  @Event() appClicked: EventEmitter = {} as EventEmitter;
  @Prop() icon: string = "";
  @Prop() name: string = "";
  @Prop() url: string = "";

  private getAppSlug() {
    return this.name.toLowerCase().replace(/ /g, "-");
  }

  appClickedHandler(event) {
    this.appClicked.emit(event);
  }

  private openApp(event: MouseEvent) {
    event.preventDefault();

    this.appClicked.emit({
      name: this.name,
      dappContainerUrl: `/dapp/${this.getAppSlug()}`,
      dappUrl: this.url
    });
  }

  render() {
    return (
      <li class="item">
        <a href={`/dapp/${this.getAppSlug()}`} onClick={e => this.openApp(e)}>
          <div class="icon">
            <img src={this.icon} alt={this.name} />
          </div>
          <span class="name">{this.name}</span>
        </a>
      </li>
    );
  }
}
