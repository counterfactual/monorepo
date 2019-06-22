import React from "react";
import { WidgetTooltip } from "../widget-tooltip/WidgetTooltip";

export type WidgetErrorMessageProps = {
  error: {
    primary?: string;
    secondary?: string;
  };
};

const WidgetErrorMessage: React.FC<WidgetErrorMessageProps> = ({ error }) =>
  error ? (
    <WidgetTooltip message={error.secondary}>
      <div className="widget-error-message">{error.primary}</div>
    </WidgetTooltip>
  ) : null;

export { WidgetErrorMessage };
