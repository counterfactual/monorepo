import React from "react";

import "./WidgetHeader.scss";

const WidgetHeader: React.FC = ({ children }) => (
  <h2 className="widget-header">{children}</h2>
);

export { WidgetHeader };
