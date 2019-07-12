import React from "react";
import "./FormInput.scss";

export type InputChangeProps = {
  validity: { valid: boolean; error?: string };
  inputName: string;
  event?: React.ChangeEvent<HTMLInputElement>;
  value?: number | string | boolean;
};

export type FormInputProps = {
  className?: string;
  label: string | React.ReactNode;
  name?: string;
  max?: number;
  min?: number;
  step?: number;
  error?: string;
  type?: string;
  unit?: string;
  required?: boolean;
  disabled?: boolean;
  value?: string | number;
  autofocus?: boolean;
  change?: ((props: InputChangeProps) => void) | undefined;
};

class FormInput extends React.Component<
  FormInputProps,
  {
    value?: string | number;
    error: string | undefined;
    valid: boolean;
  }
> {
  constructor(props: FormInputProps) {
    super(props);
    this.state = {
      value: props.value || "",
      error: props.error,
      valid: !!(props.error || (props.required && props.value !== undefined))
    };
  }

  handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { type, disabled, error, change, name } = this.props;
    const inputError =
      error || this.getError(event.target.validity, type, disabled);
    if (change) {
      change({
        event,
        validity: {
          error: error as string,
          valid: !inputError
        },
        inputName: name as string,
        value: event.target.value
      });
    }
    this.setState({
      error: inputError,
      value: event.target.value,
      valid: !inputError
    });
  }

  getError(
    validity: ValidityState,
    type?: string,
    disabled?: boolean
  ): string | undefined {
    if (disabled || type === "file") return;
    if (validity.valid) return;
    if (validity.valueMissing) return "Please fill out this field.";
    if (validity.typeMismatch) return `Please fill in a valid ${type}`;
    if (validity.tooShort) return "Please lengthen this text.";
    if (validity.tooLong) return "Please shorten this text.";
    if (validity.badInput) return "Please enter a number.";
    if (validity.stepMismatch) return "Please select a valid value.";
    if (validity.rangeOverflow) return "Please select a smaller value.";
    if (validity.rangeUnderflow) return "Please select a larger value.";
    if (validity.patternMismatch) return "Please match the requested format.";
    return "The value you entered for this field is invalid.";
  }

  render() {
    const {
      className,
      name,
      label,
      max,
      min,
      step,
      type,
      unit,
      disabled,
      required,
      autofocus
    } = this.props as FormInputProps;
    const { value, error } = this.state;
    return (
      <label className={className}>
        <div className="label">{label}</div>
        {required}
        <div
          className={disabled ? "input-container disabled" : "input-container"}
        >
          <input
            data-test-selector={name || "input"}
            name={name || "input"}
            className="input"
            autoFocus={autofocus || false}
            disabled={disabled || false}
            required={required || false}
            type={type || "text"}
            value={value}
            max={max || Infinity}
            min={isNaN(min as number) ? -Infinity : min}
            step={step || 1}
            onBlur={event => this.handleChange(event)}
            onChange={event => this.handleChange(event)}
          />
          {unit ? <div className="unit">{unit}</div> : null}
        </div>
        {error ? (
          <div
            className="error"
            data-test-selector={`error-${name || "input"}`}
          >
            {error}
          </div>
        ) : null}
      </label>
    );
  }
}

export { FormInput };
