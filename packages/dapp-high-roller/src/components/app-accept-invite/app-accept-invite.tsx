import { Component, Prop } from "@stencil/core";
import { RouterHistory } from "@stencil/router";

import { getProp } from "../../utils/utils";

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
  @Prop() history: RouterHistory = {} as RouterHistory;

  @Prop() myName: string = "";
  @Prop() betAmount: string = "";
  @Prop() opponentName: string = "";

  componentWillLoad() {
    const myName = getProp("myName", this);
    const betAmount = getProp("betAmount", this);
    const opponentName = getProp("opponentName", this);

    this.history.push({
      pathname: "/waiting",
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
