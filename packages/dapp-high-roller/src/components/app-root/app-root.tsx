import { Component } from "@stencil/core";

@Component({
  tag: "app-root",
  styleUrl: "app-root.scss",
  shadow: true
})
export class AppRoot {
  render() {
    return (
      <div class="height-100">
        <main class="height-100">
          <stencil-router>
            <stencil-route-switch scrollTopOffset={0}>
              <stencil-route url="/" component="app-logo" exact={true} />
              <stencil-route url="/profile/:name" component="app-profile" />
              <stencil-route url="/wager" component="app-wager" />
            </stencil-route-switch>
          </stencil-router>
        </main>
      </div>
    );
  }
}
