import Enzyme from "enzyme";
import Adapter from "enzyme-adapter-react-16";
import React from "react";
import { ChannelNode, ChannelNodeProps } from "./ChannelNode";

Enzyme.configure({ adapter: new Adapter() });

describe("<ChannelNode />", () => {
  let node: Enzyme.ShallowWrapper;

  const testProps = {
    type: "hub",
    name: "test_hub",
    ethAddress: "0x0001231230123",
    children: (
      <ChannelNode type="hub" name="test_hub" ethAddress="0x0001231230123" />
    )
  } as ChannelNodeProps;

  beforeEach(() => {
    node = Enzyme.shallow(<ChannelNode {...testProps} />);
  });

  it("shows the channel name", () => {
    const element = node.find(".channel-name");
    expect(element.exists()).toBe(true);
    expect(element.text()).toBe(testProps.name);
  });

  it("shows the channel address", () => {
    const element = node.find(".channel-address");
    expect(element.exists()).toBe(true);
    expect(element.text()).toBe(testProps.ethAddress);
  });

  it("toggle the node expanded status on click", () => {
    node.find(".channel-info .channel-name").simulate("click");
    expect(node.find(".channel-control-toggle").prop("src")).toBe(
      "/assets/icon/arrow.svg"
    );
    expect(true).toBe(true);
  });

  it("shows the channel menu on click", () => {
    node.find(".channel-control-menu").simulate("click");
    expect(node.find("ChannelMenu").prop("visible")).toBe(true);
    expect(
      node
        .find("ChannelMenu")
        .render()
        .text()
    ).toBe("Details");
  });
});
