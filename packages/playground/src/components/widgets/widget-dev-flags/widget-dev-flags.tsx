import { Component, State } from "@stencil/core";

@Component({
  tag: "widget-dev-flags",
  styleUrl: "widget-dev-flags.scss",
  shadow: true
})
export class WidgetDevFlags {
  @State() get matchmakeWith() {
    return localStorage.getItem("playground:matchmakeWith");
  }

  @State() get hasAnyFlags() {
    // When we support multiple flags, this should turn into:
    // [this.matchmakeWith].some(flag => Boolean(flag) === true);
    return this.matchmakeWith;
  }

  @State() showingModal: boolean = false;

  showModal() {
    this.showingModal = true;
  }

  hideModal() {
    this.showingModal = false;
  }

  unset(key: string, event: Event) {
    event.preventDefault();

    localStorage.removeItem(key);

    const target = event.target as HTMLElement;
    target.outerHTML = "Cleared!";
  }

  buildFlagRow(key: string, propName: string) {
    return (
      <tr>
        <td>{key}</td>
        <td>{this[propName]}</td>
        <td>
          <a href="#" onClick={e => this.unset(key, e)}>
            Unset
          </a>
        </td>
      </tr>
    );
  }

  @State() get dialog() {
    const rows: JSX.Element[] = [];

    if (this.matchmakeWith) {
      rows.push(this.buildFlagRow("playground:matchmakeWith", "matchmakeWith"));
    }

    const content = (
      <table cellSpacing={0} cellPadding={0}>
        <tr>
          <th>Flag</th>
          <th>Value</th>
          <th />
        </tr>
        {...rows}
      </table>
    );

    return (
      <widget-dialog
        dialogTitle="Using dev flags"
        content={content}
        dialogClass="dialog--dev-flags"
        contentClass="dialog-content--dev-flags"
        visible={this.showingModal}
        primaryButtonText="Close"
        onPrimaryButtonClicked={this.hideModal.bind(this)}
      />
    );
  }

  render() {
    return this.hasAnyFlags ? (
      [
        <widget-tooltip
          onClick={this.showModal.bind(this)}
          message="Click here for full details"
        >
          ⚠️ Using dev flags
        </widget-tooltip>,
        this.dialog
      ]
    ) : (
      <div />
    );
  }
}
