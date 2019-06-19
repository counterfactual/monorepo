import React from "react";
import { connect } from "react-redux";
import { WidgetScreen } from "../../components/widget";
import { FormButton, FormInput } from "../../components/form";

import "./AccountRegistration.scss";
import { Link } from "react-router-dom";
import { addUser } from "../../store/user";
import { User } from "../../store/types";

type AccountRegistrationProps = {
  ethAddress: string;
  addUser: (data: User) => void;
};

const AlreadyHaveAnAccount: React.FC = () => (
  <React.Fragment>
    Already have an account? <Link to="/login">Login here</Link>
  </React.Fragment>
);

const AccountRegistration: React.FC<AccountRegistrationProps> = ({
  ethAddress = "0xd30E537Bc4BDb191FF2450f5949c16CFc957abE8",
  addUser
}) => (
  <WidgetScreen
    header={"Create a Counterfactual Account"}
    post={<AlreadyHaveAnAccount />}
    exitable={false}
  >
    <form onSubmit={async e => console.log(e)}>
      <FormInput label="Username" type="text" required={true} />
      <FormInput label="E-mail (optional)" type="email" />
      <div className="smallprint">
        <b>Account will be linked to your Ethereum address: </b>
        {ethAddress}
      </div>
      {/* TODO: This should actually create the account
       before transitioning to /setup/deposit */}
      {/* <Link to="/setup/deposit"> */}
      <FormButton
        type="button"
        className="button"
        onClick={() =>
          addUser({
            username: "joey",
            email: "joey@joey.com",
            ethAddress: "0x0",
            nodeAddress: "0x0"
          })
        }
      >
        Create account
      </FormButton>
      {/* </Link> */}
    </form>
  </WidgetScreen>
);

export default connect(
  state => ({
    users: state.Users
  }),
  dispatch => ({
    addUser: (data: User) => dispatch(addUser(data))
  })
)(AccountRegistration);
