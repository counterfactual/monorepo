import React from "react";
import "./WidgetSpinner.scss";

export type WidgetSpinnerProps = {
  visible?: boolean;
  type?: "circle" | "dots";
  color?: "black" | "white";
  content?: React.ReactNode;
};

const WidgetSpinner: React.FC<WidgetSpinnerProps> = ({
  visible = false,
  type = "circle",
  color = "black",
  content
}: WidgetSpinnerProps) => {
  if (type === "circle") {
    return (
      <div
        className={`spinner spinner--circle ${
          !visible ? "spinner--hidden" : ""
        } spinner--color-${color}`}
      />
    );
  }

  if (type === "dots") {
    return (
      <div
        className={`spinner spinner--loading ${
          !visible ? "spinner--hidden" : ""
        }`}
      >
        <div className="spinner-loading">
          <div className="bounce1" />
          <div className="bounce2" />
          <div className="bounce3" />
        </div>
        {content}
      </div>
    );
  }

  return null;
};
export { WidgetSpinner };
