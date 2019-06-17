import React from "react";

import "./FormInput.scss";

export type FormInputProps = {
  label: string;
  max?: number;
  min?: number;
  step?: number;
  error?: string;
  type?: string;
  unit?: string;
  disabled?: boolean;
  value?: string | number;
  autofocus?: boolean;
  change?: ((event: React.ChangeEvent<HTMLInputElement>) => void) | undefined;
};

const FormInput: React.FC<FormInputProps> = ({
  label,
  max = Infinity,
  min = -Infinity,
  step = 1,
  error = "",
  type = "text",
  unit = "",
  disabled = false,
  value = "",
  autofocus = false,
  change = () => {}
}: FormInputProps) => {
  return (
    <label>
      <div className="label">{label}</div>

      <div
        className={disabled ? "input-container disabled" : "input-container"}
      >
        <input
          className="input"
          autoFocus={autofocus}
          disabled={disabled}
          type={type}
          value={value}
          max={max}
          min={min}
          step={step}
          onChange={change}
        />
        {unit ? <div className="unit">{unit}</div> : null}
      </div>
      {error ? <div className="error">{error}</div> : null}
    </label>
  );
};

export { FormInput };
