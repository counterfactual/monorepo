import React from "react";

import "./FormButton.scss";

export type FormButtonProps = {
  className?: string;
  spinner?: boolean;
  children?: React.ReactNode;
  disabled?: boolean;
  onClick?:
    | ((event: React.MouseEvent<HTMLButtonElement, MouseEvent>) => void)
    | undefined;
};

const FormButton: React.FC<FormButtonProps> = ({
  children,
  onClick,
  disabled = false,
  spinner = false,
  className = "button"
}: FormButtonProps) => {
  return (
    <button disabled={disabled} onClick={onClick} className={className}>
      <div>{spinner ? "Loading..." : ""}</div>
      {children}
    </button>
  );
};

export default FormButton;
