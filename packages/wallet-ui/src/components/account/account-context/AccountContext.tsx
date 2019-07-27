import { JsonRpcSigner } from "ethers/providers";
import { BigNumberish, formatEther } from "ethers/utils";
import { History } from "history";
import React from "react";
import { connect } from "react-redux";
import { Link, RouteComponentProps } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { EthereumService } from "../../../providers/EthereumService";
import { ActionType, ApplicationState, UserState } from "../../../store/types";
import { loginUser } from "../../../store/user/user";
import { RoutePath } from "../../../types";
import { FormButton } from "../../form";
import "./AccountContext.scss";

export type AccountContextProps = RouteComponentProps & {
  userState: UserState;
  counterfactualBalance: BigNumberish;
  ethAddress: string;
  loginUser: (
    ethAddress: string,
    signer: JsonRpcSigner,
    history: History
  ) => void;
};

type AccountInformationProps = AccountBalanceProps & AccountUserProps;

type AccountBalanceProps = {
  balance?: string;
};

type AccountUserProps = {
  username?: string;
};

const AccountBalance: React.FC<AccountBalanceProps> = ({ balance }) => (
  <div className="info" data-test-selector="info-balance">
    <img alt="" className="info-img" src="/assets/icon/crypto.svg" />
    <Link to={RoutePath.Balance}>
      <div className="info-text">
        <div className="info-header">Balance</div>
        <div className="info-content">{balance} ETH</div>
      </div>
    </Link>
  </div>
);

const AccountUser: React.FC<AccountUserProps> = ({ username }) => (
  <div className="info" data-test-selector="info-user">
    <img alt="" className="info-img" src="/assets/icon/account.svg" />
    <div className="info-text">
      <div className="info-header">Account</div>
      <div className="info-content">{username}</div>
    </div>
  </div>
);

const AccountInformation: React.FC<AccountInformationProps> = ({
  balance,
  username
}) => (
  <div className="account-container">
    <div className="info-container">
      <AccountBalance balance={balance} />
      <AccountUser username={username} />
    </div>
  </div>
);

export class AccountContext extends React.Component<AccountContextProps> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  render() {
    const { user } = this.props.userState;
    const {
      counterfactualBalance,
      loginUser,
      ethAddress,
      history
    } = this.props;
    const { signer } = this.context;

    return (
      <div className="account-context">
        {!user.ethAddress ? (
          <div className="btn-container">
            <FormButton
              name="login"
              className="btn"
              onClick={() => {
                loginUser(ethAddress, signer, history);
              }}
            >
              <img alt="" className="icon" src="/assets/icon/login.svg" />
              Login
            </FormButton>
          </div>
        ) : (
          <AccountInformation
            username={user.username}
            balance={formatEther(counterfactualBalance)}
          />
        )}
      </div>
    );
  }
}

export default connect(
  (state: ApplicationState) => ({
    ethAddress: state.WalletState.ethAddress,
    userState: state.UserState,
    counterfactualBalance: state.WalletState.counterfactualBalance
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    loginUser: (ethAddress: string, signer: JsonRpcSigner, history: History) =>
      dispatch(loginUser(ethAddress, signer, history))
  })
)(AccountContext);
