import { Component, Prop, State } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

/**
 * User Story
 * Alice(Accepting) accepts the game invite and joins the game
 */

@Component({
  tag: "app-accept-invite",
  styleUrl: "app-accept-invite.scss",
  shadow: true
})
export class AppAcceptInvite {
  @Prop() history: RouterHistory;

  @Prop() myName: string = "";
  @Prop() betAmount: string = "";
  @Prop() opponentName: string = "";

  componentWillLoad() {
    const myName =
      this.history.location.query && this.history.location.query.myName
        ? this.history.location.query.myName
        : this.myName;
    const betAmount =
      this.history.location.query && this.history.location.query.betAmount
        ? this.history.location.query.betAmount
        : this.betAmount;
    const opponentName =
      this.history.location.query && this.history.location.query.opponentName
        ? this.history.location.query.opponentName
        : this.opponentName;

    this.history.push({
      pathname: "/game",
      state: {
        betAmount,
        myName,
        opponentName
      },
      query: {},
      key: ""
    });
  }

  render() {
    return <div />;
  }
}
