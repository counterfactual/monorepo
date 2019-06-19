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
  showingMenu: boolean;
};

type ChannelMenuProps = {
  type: "hub" | "user" | "app";
  visible: boolean;
};

const ChannelMenu: React.FC<ChannelMenuProps> = ({ type, visible }) => (
  <menu className={`channel-menu ${visible ? "channel-menu--visible" : ""}`}>
    {type === "hub" ? (
      <React.Fragment>
        <li>Details</li>
      </React.Fragment>
    ) : null}
    {type === "app" ? (
      <React.Fragment>
        <li>Launch</li>
        <li>Debug</li>
        <li>Uninstall</li>
      </React.Fragment>
    ) : null}
  </menu>
);

class ChannelNode extends React.Component<ChannelNodeProps, ChannelNodeState> {
  constructor(props: ChannelNodeProps) {
    super(props);

    this.state = {
      expanded: true,
      showingMenu: false
    };
  }

  toggleVisibility = () => {
    this.setState({
      expanded: !this.state.expanded
    });
  };

  toggleMenu = () => {
    this.setState({
      showingMenu: !this.state.showingMenu
    });
  };

  render() {
    const { type, name, ethAddress, children } = this.props;
    const { expanded, showingMenu } = this.state;

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
          {type !== "user" ? (
            <React.Fragment>
              <button
                onClick={this.toggleMenu}
                className="btn channel-control-menu"
              >
                Menu
              </button>
              <ChannelMenu type={type} visible={showingMenu} />
            </React.Fragment>
          ) : null}
        </div>
        {children && expanded ? <ChannelTree>{children}</ChannelTree> : null}
      </li>
    );
  }
}

export { ChannelNode };
