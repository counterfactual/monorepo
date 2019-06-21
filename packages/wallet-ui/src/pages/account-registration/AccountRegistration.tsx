import React from "react";
import { Action } from "redux";
import { connect } from "react-redux";
import { Link, RouteComponentProps } from "react-router-dom";
import { ThunkDispatch } from "redux-thunk";
import { JsonRpcSigner } from "ethers/providers";
import { History } from "history";

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

type AccountRegistrationProps = RouteComponentProps & {
  wallet: WalletState;
  user: UserState;
  addUser: (data: User, signer: JsonRpcSigner, history: History) => void;
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
    const { wallet, addUser, user, history } = this.props;
    const { signer } = this.context;
    const { error } = user;

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
          {error.field === "username" ? (
            <div className="error">{error.message}</div>
          ) : null}
          <FormInput
            label="E-mail (optional)"
            type="email"
            name="email"
            change={this.handleFormChange}
          />
          {error.field === "email" ? (
            <div className="error">{error.message}</div>
          ) : null}
          <div className="smallprint">
            <b>Account will be linked to your Ethereum address: </b>
            {wallet.wallet.ethAddress}
          </div>
          {error.code && !error.field ? (
            <div className="error">{error.message}</div>
          ) : null}
          <FormButton
            type="button"
            className="button"
            onClick={() => addUser(this.state, signer, history)}
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
    addUser: (data: User, signer: JsonRpcSigner, history: History) =>
      dispatch(addUser(data, signer, history))
  })
)(AccountRegistration);
