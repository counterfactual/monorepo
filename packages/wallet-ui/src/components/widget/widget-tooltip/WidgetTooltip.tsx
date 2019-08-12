import React from "react";
import "./WidgetTooltip.scss";

export type WidgetTooltipProps = {
  children?: React.ReactNode;
  message?: string;
  toLeft?: boolean;
};

const WidgetTooltip: React.FC<WidgetTooltipProps> = ({
  children,
  message = "",
  toLeft = false
}: WidgetTooltipProps) => {
  return (
    <div className="widget-tooltip">
      {children}
      {message ? (
        <div className={`widget-tooltip-message${toLeft ? " toLeft" : ""}`}>
          {message}
        </div>
      ) : (
        undefined
      )}
    </div>
  );
};

export { WidgetTooltip };
