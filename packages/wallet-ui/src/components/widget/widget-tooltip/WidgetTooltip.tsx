import React from "react";
import "./WidgetTooltip.scss";

export type WidgetTooltipProps = {
  children?: React.ReactNode;
  message?: string;
};

const WidgetTooltip: React.FC<WidgetTooltipProps> = ({
  children,
  message = ""
}: WidgetTooltipProps) => {
  return (
    <div className="widget-tooltip">
      {children}
      {message ? (
        <div className="widget-tooltip-message">{message}</div>
      ) : (
        undefined
      )}
    </div>
  );
};

export { WidgetTooltip };
