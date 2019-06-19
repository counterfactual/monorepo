import React from "react";

import { ChannelTree } from "../channel-tree/ChannelTree";

import "./ChannelNode.scss";

type ChannelNodeProps = {
  type: "hub" | "user" | "app";
  name: string;
  ethAddress: string;
  children?: React.ReactNode;
};

type ChannelNodeState = {
  expanded: boolean;
};

class ChannelNode extends React.Component<ChannelNodeProps, ChannelNodeState> {
  constructor(props) {
    super(props);

    this.state = {
      expanded: true
    };
  }

  toggleVisibility = () => {
    this.setState({
      expanded: !this.state.expanded
    });
  };

  render() {
    const { type, name, ethAddress, children } = this.props;
    const { expanded } = this.state;

    return (
      <li className="channel-node">
        <div className={`channel-node-wrapper channel-node-wrapper--${type}`}>
          <nav className="channel-controls">
            {children ? (
              <img
                onClick={this.toggleVisibility}
                className="channel-control-toggle"
                alt="toggle"
                src={`/assets/icon/toggle-${
                  expanded ? "collapse" : "expand"
                }.svg`}
              />
            ) : (
              <span className="channel-control-toggle-placeholder" />
            )}
            <img
              onClick={this.toggleVisibility}
              alt={type}
              src={`/assets/icon/channel-${type}.svg`}
              className="channel-icon"
            />
          </nav>
          <section className="channel-info">
            <h3 onClick={this.toggleVisibility} className="channel-name">
              {name}
            </h3>
            <div className="channel-address">{ethAddress}</div>
          </section>
        </div>
        {children && expanded ? <ChannelTree>{children}</ChannelTree> : null}
      </li>
    );
  }
}

export { ChannelNode };
