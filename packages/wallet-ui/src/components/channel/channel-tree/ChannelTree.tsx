import React from "react";

import "./ChannelTree.scss";

type ChannelTreeProps = {
  children: React.ReactNode;
};

const ChannelTree: React.FC<ChannelTreeProps> = ({ children }) => (
  <ul className="channel-tree">{children}</ul>
);

export { ChannelTree };
