import { JsonRpcSigner } from "ethers/providers";
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
import { getFormattedBalanceFrom } from "../../../utils/nodeTokenClient";
import { FormButton } from "../../form";
import "./AccountContext.scss";
import { WidgetTooltip } from "../../widget";

export type AccountContextProps = RouteComponentProps & {
  userState: UserState;
  ethAddress: string;
  tokens: AssetType[];
  loginUser: (
    ethAddress: string,
    signer: JsonRpcSigner,
    history: History
  ) => void;
};

type AccountInformationProps = AccountBalanceProps & AccountUserProps;

type AccountBalanceProps = {
  tokens: AssetType[];
};

type AccountUserProps = {
  username?: string;
};

const AccountBalance: React.FC<AccountBalanceProps> = ({ tokens }) => {
  return (
    <div className="info" data-test-selector="info-balance">
      <img alt="" className="info-img" src="/assets/icon/crypto.svg" />
      <Link to={RoutePath.Balance}>
        <div className="info-text">
          <div className="info-header">Balance</div>
          <div className="info-content">
            {getFormattedBalanceFrom(tokens)} ETH
            {tokens.length > 1 ? (
              <div className="info-hover">
                {tokens.map((token, index) => (
                  <span key={`token${token.tokenAddress}`}>
                    {getFormattedBalanceFrom(tokens, index)}{" "}
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
  username,
  tokens
}) => (
  <div className="account-container">
    <div className="info-container">
      <AccountBalance tokens={tokens} />
      <AccountUser username={username} />
    </div>
  </div>
);

export class AccountContext extends React.Component<AccountContextProps> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  render() {
    const { user, error } = this.props.userState;
    const { loginUser, ethAddress, history, tokens } = this.props;
    const { signer } = this.context;
    return (
      <div className="account-context">
        {!user.ethAddress ? (
          <div className="btn-container">
            <WidgetTooltip
              toLeft={true}
              message={error && error.code ? "No user was found" : ""}
            >
              <FormButton
                name="login"
                className={`btn ${error && error.code ? "btn-error" : ""}`}
                onClick={() => {
                  loginUser(ethAddress, signer, history);
                }}
              >
                <img alt="" className="icon" src="/assets/icon/login.svg" />
                Login
              </FormButton>
            </WidgetTooltip>
          </div>
        ) : (
          <AccountInformation
            username={user.username}
            tokens={tokens.filter(
              token => token.name && token.counterfactualBalance
            )}
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
    loginUser: (ethAddress: string, signer: JsonRpcSigner, history: History) =>
      dispatch(loginUser(ethAddress, signer, history))
  })
)(AccountContext);
