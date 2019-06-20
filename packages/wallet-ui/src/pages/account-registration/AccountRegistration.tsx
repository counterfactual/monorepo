import React from "react";
import { connect } from "react-redux";
import { WidgetScreen } from "../../components/widget";
import { FormButton, FormInput } from "../../components/form";

import "./AccountRegistration.scss";
import { Link } from "react-router-dom";
import { addUser } from "../../store/user";
import { ThunkDispatch } from "redux-thunk";
import { Action } from "redux";
import {
  ApplicationState,
  ActionType,
  User,
  WalletState
} from "../../store/types";

type AccountRegistrationProps = {
  wallet: WalletState;
  addUser: (data: User) => void;
};

const AlreadyHaveAnAccount: React.FC = () => (
  <React.Fragment>
    Already have an account? <Link to="/login">Login here</Link>
  </React.Fragment>
);

const AccountRegistration: React.FC<AccountRegistrationProps> = ({
  wallet,
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
        {wallet.wallet.ethAddress}
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
  (state: ApplicationState) => ({
    wallet: state.Wallet
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    addUser: (data: User) => dispatch(addUser(data))
  })
)(AccountRegistration);
