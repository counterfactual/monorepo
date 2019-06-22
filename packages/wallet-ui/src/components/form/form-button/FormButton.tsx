import React from "react";

import "./FormButton.scss";
import { WidgetSpinner } from "../../widget";

export type FormButtonProps = {
  className?: string;
  spinner?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?:
    | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)
    | undefined;
  type?: "submit" | "button";
};

const FormButton: React.FC<FormButtonProps> = ({
  children,
  onClick,
  disabled = false,
  spinner = false,
  className = "button",
  type = "button"
}: FormButtonProps) => {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={className}
      type={type}
    >
      {spinner ? <WidgetSpinner /> : null}
      {children}
    </button>
  );
};

export { FormButton };
