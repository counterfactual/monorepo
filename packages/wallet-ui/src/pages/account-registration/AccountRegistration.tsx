import React from "react";

import { WidgetScreen } from "../../components/widget";
import { FormButton, FormInput } from "../../components/form";

import "./AccountRegistration.scss";

export type AccountRegistrationProps = {
  ethAddress: string;
};

const AccountRegistration: React.FC<AccountRegistrationProps> = ({
  ethAddress = "0xd30E537Bc4BDb191FF2450f5949c16CFc957abE8"
}) => {
  return (
    <WidgetScreen header={"Create a Counterfactual Account"} exitable={false}>
      <form onSubmit={async e => console.log(e)}>
        <FormInput label="Username" type="text" />
        <FormInput label="E-mail (optional)" type="email" />
        <div className="smallprint">
          <b>Account will be linked to your Ethereum address: </b>
          {ethAddress}
        </div>
        <FormButton type="submit" className="button">
          Create an account
        </FormButton>
      </form>
    </WidgetScreen>
  );
};

export { AccountRegistration };
