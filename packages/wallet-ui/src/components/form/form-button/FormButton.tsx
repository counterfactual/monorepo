import React from "react";
import { WidgetSpinner } from "../../widget";
import "./FormButton.scss";

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
      {spinner ? <WidgetSpinner visible={spinner} color="white" /> : false}
      {children}
    </button>
  );
};

export { FormButton };
