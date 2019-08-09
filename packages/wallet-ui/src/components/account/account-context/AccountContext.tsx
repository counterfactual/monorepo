import { Zero } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { formatEther, BigNumber } from "ethers/utils";
import { History } from "history";
import React from "react";
import { connect } from "react-redux";
import { Link, RouteComponentProps } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { EthereumService } from "../../../providers/EthereumService";
import {
  ActionType,
  ApplicationState,
  AssetType,
  UserState
} from "../../../store/types";
import { loginUser } from "../../../store/user/user";
import { RoutePath } from "../../../types";
import { FormButton } from "../../form";
import "./AccountContext.scss";

export type AccountContextProps = RouteComponentProps & {
  userState: UserState;
  ethAddress: string;
  tokens: AssetType[];
  loginUser: (
    ethAddress: string,
    signer: JsonRpcSigner,
    history: History,
    provider: Web3Provider
  ) => void;
};

type AccountInformationProps = AccountBalanceProps & AccountUserProps;

type AccountBalanceProps = {
  balance?: string;
  tokens: AssetType[];
};

type AccountUserProps = {
  username?: string;
};

const AccountBalance: React.FC<AccountBalanceProps> = ({ balance, tokens }) => {
  return (
    <div className="info" data-test-selector="info-balance">
      <img alt="" className="info-img" src="/assets/icon/crypto.svg" />
      <Link to={RoutePath.Balance}>
        <div className="info-text">
          <div className="info-header">Balance</div>
          <div className="info-content">
            {balance} ETH
            {tokens.length > 1 ? (
              <div className="info-hover">
                {tokens
                  .filter(token => token.name && token.counterfactualBalance)
                  .map(token => (
                    <span key={`token${token.tokenAddress}`}>
                      {formatEther(
                        (token.counterfactualBalance as BigNumber) || Zero
                      )}{" "}
                      {String(token.shortName).toUpperCase()}
                    </span>
                  ))}
              </div>
            ) : (
              false
            )}
          </div>
        </div>
      </Link>
    </div>
  );
};

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
  username,
  tokens
}) => (
  <div className="account-container">
    <div className="info-container">
      <AccountBalance balance={balance} tokens={tokens} />
      <AccountUser username={username} />
    </div>
  </div>
);

export class AccountContext extends React.Component<AccountContextProps> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  render() {
    const { user } = this.props.userState;
    const { loginUser, ethAddress, history, tokens } = this.props;
    const { signer, provider } = this.context;
    const balance: string = formatEther(
      (tokens[0] && tokens[0].counterfactualBalance) || Zero
    );
    return (
      <div className="account-context">
        {!user.ethAddress ? (
          <div className="btn-container">
            <FormButton
              name="login"
              className="btn"
              onClick={() => {
                loginUser(ethAddress, signer, history, provider);
              }}
            >
              <img alt="" className="icon" src="/assets/icon/login.svg" />
              Login
            </FormButton>
          </div>
        ) : (
          <AccountInformation
            username={user.username}
            balance={balance}
            tokens={tokens}
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
    tokens: state.WalletState.tokenAddresses
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    loginUser: (
      ethAddress: string,
      signer: JsonRpcSigner,
      history: History,
      provider: Web3Provider
    ) => dispatch(loginUser(ethAddress, signer, history, provider))
  })
)(AccountContext);
