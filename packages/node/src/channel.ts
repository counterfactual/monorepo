import * as cf from "@counterfactual/cf.js";

// Not strictly needed, added for easier legibility
export type MultisigAddress = string;

export class StateChannelInfo implements cf.legacy.channel.StateChannelInfo {
  constructor(
    readonly counterParty: cf.legacy.utils.Address,
    readonly me: cf.legacy.utils.Address,
    readonly multisigAddress: cf.legacy.utils.Address,
    readonly appInstances: cf.legacy.app.AppInstanceInfos = {},
    readonly freeBalance: cf.legacy.utils.FreeBalance
  ) {}

  /**
   * @returns the toAddress, fromAddress in alphabetical order.
   */
  public owners(): string[] {
    return [this.counterParty, this.me].sort((a, b) => (a < b ? -1 : 1));
  }
}
