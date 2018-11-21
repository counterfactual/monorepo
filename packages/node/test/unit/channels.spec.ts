import * as cf from "@counterfactual/cf.js";
import * as _ from "lodash";

import { StateChannelInfo } from "../../src/channel";
import { Node } from "../../src/node";

describe("Channel operations on the Node", () => {
  let node: Node;
  const channelAB = new StateChannelInfo(
    cf.legacy.constants.B_ADDRESS,
    cf.legacy.constants.A_ADDRESS,
    cf.legacy.constants.C_ADDRESS,
    {},
    cf.legacy.constants.EMPTY_FREE_BALANCE
  );

  beforeEach(() => {
    node = new Node();
  });

  it("can open a channel", () => {
    // drop the error variable as it's not being checked
    const [result] = node.openChannel(channelAB);
    expect(result).toBeTruthy();
    expect(_.keys(node.getChannels())[0]).toEqual(channelAB.multisigAddress);
    expect(_.values(node.getChannels())[0]).toEqual(channelAB);
  });

  it("can not open a channel", () => {
    node.openChannel(channelAB);
    const [result, error] = node.openChannel(channelAB);
    expect(result).toBeFalsy();
    expect(error).toEqual(
      `Channel with multisig address ${
        channelAB.multisigAddress
      } is already open`
    );
    expect(_.keys(node.getChannels())[0]).toEqual(channelAB.multisigAddress);
    expect(_.values(node.getChannels())[0]).toEqual(channelAB);
  });
});
