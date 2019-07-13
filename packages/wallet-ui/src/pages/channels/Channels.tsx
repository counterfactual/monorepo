import React from "react";
import { ThunkDispatch } from "redux-thunk";
import { Action } from "redux";
import { connect } from "react-redux";

import { ChannelTree, ChannelNode } from "../../components/channel";
import { ApplicationState, ActionType, ChannelsState } from "../../store/types";
import { getAllChannels } from "../../store/channels";

import "./Channels.scss";
import log from "../../utils/log";

type ChannelsProps = {
  getAllChannels: () => void;
  channelsState: ChannelsState;
};

class Channels extends React.Component<ChannelsProps> {
  componentDidMount() {
    const { getAllChannels } = this.props;

    getAllChannels();
  }

  render() {
    const { channels } = this.props.channelsState;

    log("State channels", channels);

    return (
      <section className="section fill">
        <h3>State Channels</h3>
        <div className="channel-trees">
          <ChannelTree>
            {Object.values(channels).map((channel, index) => (
              <ChannelNode
                key={`hub${index}`}
                type={channel.type}
                name={channel.name}
                ethAddress={channel.ethAddress}
              />
            ))}
          </ChannelTree>
          {/* <ChannelTree>
            <ChannelNode type="hub" ethAddress="0x0" name="Playground Server">
              <ChannelNode type="user" ethAddress="0x1" name="High Roller Bot">
                <ChannelNode type="app" ethAddress="0x2" name="High Roller" />
              </ChannelNode>
            </ChannelNode>
          </ChannelTree>
          <ChannelTree>
            <ChannelNode type="hub" ethAddress="0x0" name="Connext Server" />
          </ChannelTree> */}
        </div>
        <button className="btn btn-secondary button-discover-apps">
          Discover State Channel apps
        </button>
      </section>
    );
  }
}

export default connect(
  (state: ApplicationState) => ({
    channelsState: state.ChannelsState
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    getAllChannels: () => dispatch(getAllChannels())
  })
)(Channels);
