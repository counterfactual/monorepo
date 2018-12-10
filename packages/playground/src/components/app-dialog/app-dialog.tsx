import { Component, Element, Event, Prop, EventEmitter } from "@stencil/core";

export interface AppDialogSettings {
  title?: string;
  icon?: string;
  content: JSX.Element;
  primaryButtonText: string;
  secondaryButtonText?: string;
  onPrimaryButtonClicked: Function;
  onSecondaryButtonClicked?: Function;
}

@Component({
  tag: "app-dialog",
  shadow: true
})
export default class AppDialog {
  @Element() el: HTMLStencilElement = {} as HTMLStencilElement;
  @Prop({ mutable: true }) visible: boolean = false;
  @Prop() title: string = "";
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
      <dialog open={this.visible}>
        <header>
          {this.title ? <h2>${this.title}</h2> : <img src={this.icon} />}
        </header>
        <main>{this.content}</main>
        <footer>
          <button onClick>{this.primaryButtonText}</button>
          {this.secondaryButtonText ? (
            <button>${this.secondaryButtonText}</button>
          ) : (
            {}
          )}
        </footer>
      </dialog>
    );
  }
}
