import { Component, Element, Event, EventEmitter, Prop } from "@stencil/core";

@Component({
  tag: "widget-dialog",
  styleUrl: "widget-dialog.scss",
  shadow: true
})
export class WidgetDialog {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @Prop({ mutable: true }) visible: boolean = false;
  @Prop() dialogTitle: string = "";
  @Prop() icon: string = "";
  @Prop() content: JSX.Element = {} as JSX.Element;
  @Prop() primaryButtonText: string = "";
  @Prop() secondaryButtonText: string = "";

  @Event() primaryButtonClicked: EventEmitter = {} as EventEmitter;
  @Event() secondaryButtonClicked: EventEmitter = {} as EventEmitter;

  primaryButtonClickedHandler() {
    this.primaryButtonClicked.emit();
  }

  secondaryButtonClickedHandler() {
    this.secondaryButtonClicked.emit();
  }

  render() {
    return (
      <div
        class={this.visible ? "dialog-wrapper dialog--open" : "dialog-wrapper"}
      >
        <dialog open={this.visible}>
          <header>
            {this.dialogTitle ? (
              <h2>{this.dialogTitle}</h2>
            ) : (
              <img src={this.icon} />
            )}
          </header>
          <main>{this.content}</main>
          <footer>
            <button onClick={() => this.primaryButtonClickedHandler()}>
              {this.primaryButtonText}
            </button>
            {this.secondaryButtonText ? (
              <button onClick={() => this.secondaryButtonClickedHandler()}>
                {this.secondaryButtonText}
              </button>
            ) : (
              {}
            )}
          </footer>
        </dialog>
      </div>
    );
  }
}
