import React from "react";
import { WidgetScreen } from "../../components/widget";
import { FormInput, FormButton } from "../../components/form";

export type AccountRegistrationChangeset = {
  username: string;
  email: string;
  ethAddress: string;
};

export type AccountRegistrationErrors = {
  username: string;
  email: string;
  ethAddress: string;
};

export type AccountRegistrationProps = {
  changeset: AccountRegistrationChangeset;
  errors: AccountRegistrationErrors;
};

const AccountRegistration: React.FC<AccountRegistrationProps> = ({
  changeset = {} as AccountRegistrationChangeset,
  errors = {} as AccountRegistrationErrors
}) => {
  return (
    <WidgetScreen>
      <div slot="header">Create a Playground Account</div>

      <form onSubmit={async e => console.log(e)}>
        <FormInput
          label="Username"
          value={changeset.username}
          error={errors.username}
          autofocus={true}
          // onChange={e => this.change("username", e)}
        />
        <FormInput
          // disabled={inputIsDisabled}
          label="Email (optional)"
          value={changeset.email}
          error={errors.email}
          // onChange={e => this.change("email", e)}
        />
        <div className="smallprint">
          <b>Account will be linked to your Ethereum address: </b>
          {changeset.ethAddress}
        </div>
        <div className="error">{errors.ethAddress}</div>
        <FormButton
          className="button"
          // disabled={inputIsDisabled}
          // spinner={inputIsDisabled}
          // onButtonPressed={async e => await this.formSubmissionHandler()}
        >
          Create an account
          {/* {buttonTexts[this.stage]} */}
        </FormButton>
      </form>
      {/* {slotElement} */}
    </WidgetScreen>
  );
};

export { AccountRegistration };
