import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";
import * as _ from "lodash";

import { Node, StateChannelInfoImpl } from "../../src/node";

describe("Node can contain channels", () => {
  it("Node has no channels", () => {
    const channels = {};
    const node = new Node(channels, cf.legacy.network.EMPTY_NETWORK_CONTEXT);
    expect(node.channelStates).toEqual({});
  });

  it("Node has only 1 channel", () => {
    const channels = {
      [cf.legacy.constants.ADDRESS_A]: new StateChannelInfoImpl(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        {},
        cf.legacy.constants.EMPTY_FREE_BALANCE
      )
    };
    const node = new Node(channels, cf.legacy.network.EMPTY_NETWORK_CONTEXT);
    expect(_.size(node.channelStates)).toEqual(1);
  });

  it("Node has multiple channels", () => {
    const channels = {
      [cf.legacy.constants.ADDRESS_A]: new StateChannelInfoImpl(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        {},
        cf.legacy.utils.EMPTY_FREE_BALANCE
      ),
      [cf.legacy.constants.ADDRESS_B]: new StateChannelInfoImpl(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        {},
        cf.legacy.utils.EMPTY_FREE_BALANCE
      )
    };
    const node = new Node(channels, cf.legacy.network.EMPTY_NETWORK_CONTEXT);
    expect(_.size(node.channelStates)).toEqual(2);
  });
});
