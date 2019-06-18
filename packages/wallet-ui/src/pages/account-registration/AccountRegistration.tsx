import React from "react";

import { WidgetScreen } from "../../components/widget";
import { FormButton, FormInput } from "../../components/form";

import "./AccountRegistration.scss";
import { Link } from "react-router-dom";

type AccountRegistrationProps = {
  ethAddress: string;
};

const AlreadyHaveAnAccount: React.FC = () => (
  <React.Fragment>
    Already have an account? <Link to="/login">Login here</Link>
  </React.Fragment>
);

const AccountRegistration: React.FC<AccountRegistrationProps> = ({
  ethAddress = "0xd30E537Bc4BDb191FF2450f5949c16CFc957abE8"
}) => (
  <WidgetScreen
    header={"Create a Counterfactual Account"}
    post={<AlreadyHaveAnAccount />}
    exitable={false}
  >
    <form onSubmit={async e => console.log(e)}>
      <FormInput label="Username" type="text" />
      <FormInput label="E-mail (optional)" type="email" />
      <div className="smallprint">
        <b>Account will be linked to your Ethereum address: </b>
        {ethAddress}
      </div>
      <FormButton type="submit" className="button">
        Create account
      </FormButton>
    </form>
  </WidgetScreen>
);

export { AccountRegistration };
