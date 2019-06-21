import React from "react";
import { Action } from "redux";
import { connect } from "react-redux";
import { Link } from "react-router-dom";
import { ThunkDispatch } from "redux-thunk";
import { JsonRpcSigner } from "ethers/providers";

import { WidgetScreen } from "../../components/widget";
import { FormButton, FormInput, InputChangeProps } from "../../components/form";

import { addUser } from "../../store/user";
import {
  ApplicationState,
  ActionType,
  User,
  WalletState,
  UserState
} from "../../store/types";
import { EthereumService } from "../../providers/EthereumService";

import "./AccountRegistration.scss";

type AccountRegistrationProps = {
  wallet: WalletState;
  user: UserState;
  addUser: (data: User, signer: JsonRpcSigner) => void;
};

const AlreadyHaveAnAccount: React.FC = () => (
  <React.Fragment>
    Already have an account? <Link to="/login">Login here</Link>
  </React.Fragment>
);

class AccountRegistration extends React.Component<
  AccountRegistrationProps,
  User
> {
  static contextType = EthereumService;
  constructor(props: AccountRegistrationProps) {
    super(props);
    this.state = {
      username: "",
      email: "",
      ethAddress: props.wallet.wallet.ethAddress,
      nodeAddress: ""
    };
  }

  handleFormChange = (event: InputChangeProps) => {
    this.setState({ ...this.state, [event.inputName]: event.value });
  };

  render() {
    const { wallet, addUser, user } = this.props;
    const { signer } = this.context;

    return (
      <WidgetScreen
        header={"Create a Counterfactual Account"}
        post={<AlreadyHaveAnAccount />}
        exitable={false}
      >
        <form>
          <FormInput
            label="Username"
            type="text"
            name="username"
            required={true}
            change={this.handleFormChange}
          />
          <FormInput
            label="E-mail (optional)"
            type="email"
            name="email"
            change={this.handleFormChange}
          />
          <div className="smallprint">
            <b>Account will be linked to your Ethereum address: </b>
            {wallet.wallet.ethAddress}
          </div>
          {user.error.code ? (
            <div className="error">{user.error.code}</div>
          ) : null}
          <FormButton
            type="button"
            className="button"
            onClick={() => addUser(this.state, signer)}
          >
            Create account
          </FormButton>
        </form>
      </WidgetScreen>
    );
  }
}
export default connect(
  (state: ApplicationState) => ({
    wallet: state.Wallet,
    user: state.User
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    addUser: (data: User, signer: JsonRpcSigner) =>
      dispatch(addUser(data, signer))
  })
)(AccountRegistration);
