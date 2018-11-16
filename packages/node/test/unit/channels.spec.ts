import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";
import * as _ from "lodash";

import { Node, StateChannelInfoImpl } from "../../src/node";

describe("Node can contain channels", () => {
  it("is defined", () => {
    expect(Node).toBeDefined();
  });

  it("can initialize with defaults", () => {
    const node = new Node(cf.legacy.network.EMPTY_NETWORK_CONTEXT);
    expect(node).toBeDefined();
  });

  it("can initialize with no channels", () => {
    const channels = {};
    const node = new Node(cf.legacy.network.EMPTY_NETWORK_CONTEXT, channels);
    expect(node.channelStates).toEqual({});
  });

  it("can initialize with only 1 channel", () => {
    const channels = {
      [cf.legacy.constants.ADDRESS_A]: new StateChannelInfoImpl(
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        ethers.constants.AddressZero,
        {},
        cf.legacy.constants.EMPTY_FREE_BALANCE
      )
    };
    const node = new Node(cf.legacy.network.EMPTY_NETWORK_CONTEXT, channels);
    expect(_.size(node.channelStates)).toEqual(1);
    expect(_.keys(node.channelStates)[0]).toEqual(
      cf.legacy.constants.ADDRESS_A
    );
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
    const node = new Node(cf.legacy.network.EMPTY_NETWORK_CONTEXT, channels);
    expect(_.size(node.channelStates)).toEqual(2);
    expect(_.keys(node.channelStates)[0]).toEqual(
      cf.legacy.constants.ADDRESS_A
    );
    expect(_.keys(node.channelStates)[1]).toEqual(
      cf.legacy.constants.ADDRESS_B
    );
  });
});
