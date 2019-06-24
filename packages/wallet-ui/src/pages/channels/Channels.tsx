import React from "react";
import { ChannelTree, ChannelNode } from "../../components/channel";

import "./Channels.scss";

export const Channels: React.FC = () => {
  return (
    <section className="section fill">
      <h3>State Channels</h3>
      <div className="channel-trees">
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
      </div>
      <button className="btn btn-secondary button-discover-apps">
        Discover State Channel apps
      </button>
    </section>
  );
};
