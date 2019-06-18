import React from "react";

import "./WidgetCard.scss";

const WidgetCard: React.FC = ({ children }) => (
  <div className="card">{children}</div>
);

export { WidgetCard };
