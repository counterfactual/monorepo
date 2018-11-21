import * as cf from "@counterfactual/cf.js";

export class Node {
  private channels: cf.legacy.channel.StateChannelInfos = {};
  constructor() {}

  /**
   * Given a channel, this adds said channel to the state of the Node if a
   * channel with the same multisig address does not exist.
   * @param channel The channel to keep track of.
   */
  openChannel(channel: cf.legacy.channel.StateChannelInfo): [boolean, string] {
    if (this.channels[channel.multisigAddress] !== undefined) {
      return [
        false,
        `Channel with multisig address ${
          channel.multisigAddress
        } is already open`
      ];
    }
    this.channels[channel.multisigAddress] = channel;
    return [true, ""];
  }

  /**
   * Retrieve the list of channels that are open in this Node.
   * TODO: add auth token to retrieve only authorized channel(s)
   */
  getChannels(): cf.legacy.channel.StateChannelInfos {
    return this.channels;
  }
}
