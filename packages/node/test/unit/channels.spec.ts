import * as cf from "@counterfactual/cf.js";

import { StateChannelInfo } from "../../src/channel";
import { Node } from "../../src/node";

describe("Basic channel operations and integrity on the Node", () => {
  let node: Node;
  let result: boolean;
  let error: string;
  const channelAB = new StateChannelInfo(
    cf.legacy.constants.B_ADDRESS,
    cf.legacy.constants.A_ADDRESS,
    cf.legacy.constants.C_ADDRESS,
    {},
    cf.legacy.constants.EMPTY_FREE_BALANCE
  );

  beforeEach(() => {
    node = new Node({});
  });

  it("can open a channel", () => {
    // drop the second returned variable as it's not being checked
    [result] = node.openChannel(channelAB);
    expect(result).toBeTruthy();
    expect(
      node
        .getChannels()
        .keys()
        .next().value
    ).toEqual(channelAB.multisigAddress);
    expect(
      node
        .getChannels()
        .values()
        .next().value
    ).toEqual(channelAB);
  });

  it("channel has correct owners", () => {
    [result] = node.openChannel(channelAB);
    expect(result).toBeTruthy();
    expect(
      node
        .getChannels()
        .values()
        .next()
        .value.owners()
    ).toEqual([cf.legacy.constants.A_ADDRESS, cf.legacy.constants.B_ADDRESS]);
  });

  it("channel has correct free balance", () => {
    [result] = node.openChannel(channelAB);
    expect(result).toBeTruthy();
    expect(
      node
        .getChannels()
        .values()
        .next().value.freeBalance
    ).toEqual(cf.legacy.constants.EMPTY_FREE_BALANCE);
  });

  it("channel has correct app instances", () => {
    [result] = node.openChannel(channelAB);
    expect(result).toBeTruthy();
    expect(
      node
        .getChannels()
        .values()
        .next().value.appInstances
    ).toEqual({});
  });

  it("can not open a channel", () => {
    node.openChannel(channelAB);
    [result, error] = node.openChannel(channelAB);
    expect(result).toBeFalsy();
    expect(error).toEqual(
      `Channel with multisig address ${
        channelAB.multisigAddress
      } is already open`
    );
    expect(
      node
        .getChannels()
        .keys()
        .next().value
    ).toEqual(channelAB.multisigAddress);
    expect(
      node
        .getChannels()
        .values()
        .next().value
    ).toEqual(channelAB);
  });

  it("can close a channel", () => {
    [result] = node.openChannel(channelAB);
    expect(result).toBeTruthy();
    expect(
      node
        .getChannels()
        .keys()
        .next().value
    ).toEqual(channelAB.multisigAddress);
    expect(
      node
        .getChannels()
        .values()
        .next().value
    ).toEqual(channelAB);

    [result, error] = node.closeChannel(channelAB.multisigAddress);
    expect(result).toBeTruthy();
    expect(node.getChannels().size).toEqual(0);
  });

  it("can not close a channel that doesn't exist", () => {
    [result, error] = node.closeChannel(channelAB.multisigAddress);
    expect(result).toBeFalsy();
    expect(error).toEqual(
      `Channel with multisig address ${
        channelAB.multisigAddress
      } does not exist on this Node`
    );
    expect(node.getChannels().size).toEqual(0);
  });
});
