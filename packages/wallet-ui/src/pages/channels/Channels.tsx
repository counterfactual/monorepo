import React from "react";
import { ChannelTree, ChannelNode } from "../../components/channel";

export class Channels extends React.Component {
  render() {
    return (
      <section className="section fill">
        <h2>State Channels</h2>
        <ChannelTree>
          <ChannelNode type="hub" ethAddress="0x0" name="Playground Server">
            <ChannelNode type="user" ethAddress="0x1" name="High Roller Bot">
              <ChannelNode type="app" ethAddress="0x2" name="High Roller" />
            </ChannelNode>
          </ChannelNode>
        </ChannelTree>
        <ChannelTree>
          <ChannelNode type="hub" ethAddress="0x0" name="Connext Server" />
        </ChannelTree>
      </section>
    );
  }
}
