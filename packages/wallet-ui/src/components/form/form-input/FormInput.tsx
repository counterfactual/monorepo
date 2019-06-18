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
export type FormInputState = {
  value?: string | number;
};

class FormInput extends React.Component<FormInputProps, FormInputState> {
  constructor(props: FormInputProps) {
    super(props);

    this.state = { value: props.value || (props.type === "number" ? 0 : "") };
  }

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({ value: event.target.value });

    if (this.props.change) {
      this.props.change(event);
    }
  };

  render() {
    const {
      label,
      max,
      min,
      step,
      error,
      type,
      unit,
      disabled,
      autofocus
    } = this.props as FormInputProps;
    return (
      <label>
        <div className="label">{label}</div>

        <div
          className={disabled ? "input-container disabled" : "input-container"}
        >
          <input
            className="input"
            autoFocus={autofocus || false}
            disabled={disabled || false}
            type={type || "text"}
            value={this.state.value}
            max={max || Infinity}
            min={min || -Infinity}
            step={step || 1}
            onChange={this.handleChange}
          />
          {unit ? <div className="unit">{unit}</div> : null}
        </div>
        {error ? <div className="error">{error}</div> : null}
      </label>
    );
  }
}

export { FormInput };
