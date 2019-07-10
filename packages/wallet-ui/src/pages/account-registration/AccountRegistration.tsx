import { JsonRpcSigner } from "ethers/providers";
import { History } from "history";
import React from "react";
import { connect } from "react-redux";
import { Link, RouteComponentProps } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { FormButton, FormInput, InputChangeProps } from "../../components/form";
import { WidgetScreen } from "../../components/widget";
import { EthereumService } from "../../providers/EthereumService";
import {
  ActionType,
  ApplicationState,
  ErrorData,
  User,
  WalletState
} from "../../store/types";
import { addUser, UserAddTransition } from "../../store/user";
import "./AccountRegistration.scss";

export type AccountRegistrationProps = RouteComponentProps & {
  wallet: WalletState;
  error: ErrorData;
  registrationStatus: string;
  addUser: (data: User, signer: JsonRpcSigner, history: History) => void;
};

export type AccountRegistrationState = User & { loading: boolean };
class AccountRegistration extends React.Component<
  AccountRegistrationProps,
  AccountRegistrationState
> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  constructor(props: AccountRegistrationProps) {
    super(props);

    this.state = {
      username: "",
      email: "",
      ethAddress: props.wallet.ethAddress,
      nodeAddress: "",
      loading: false
    };
  }

  buttonText = {
    [UserAddTransition.CheckWallet]: "Check your wallet",
    [UserAddTransition.CreatingAccount]: "Creating your Account",
    [UserAddTransition.DeployingContract]: "Deploying the contract"
  };

  handleFormChange = (event: InputChangeProps) => {
    this.setState({ ...this.state, [event.inputName]: event.value });
  };

  render() {
    const { wallet, addUser, error, history, registrationStatus } = this.props;
    const { loading } = this.state;
    const { signer } = this.context;
    return (
      <WidgetScreen
        header={"Create a Counterfactual Account"}
        post={
          <React.Fragment>
            Already have an account? <Link to="/login">Login here</Link>
          </React.Fragment>
        }
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
            {wallet.ethAddress}
          </div>
          {error.code && !error.field ? (
            <div className="error">{error.message}</div>
          ) : null}
          <FormButton
            type="button"
            className="button"
            spinner={loading}
            disabled={loading}
            onClick={() => {
              this.setState({ loading: true });
              addUser(this.state, signer, history);
            }}
          >
            {!loading ? "Create account" : this.buttonText[registrationStatus]}
          </FormButton>
        </form>
      </WidgetScreen>
    );
  }
}
export default connect(
  (state: ApplicationState) => ({
    wallet: state.WalletState,
    error: state.UserState.error,
    registrationStatus: state.UserState.status
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    addUser: (data: User, signer: JsonRpcSigner, history: History) =>
      dispatch(addUser(data, signer, history))
  })
)(AccountRegistration);
