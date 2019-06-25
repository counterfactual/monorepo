import React from "react";
import { Action } from "redux";
import { connect } from "react-redux";
import { ThunkDispatch } from "redux-thunk";
import { RouteComponentProps, Link } from "react-router-dom";

import { FormButton } from "../../form";
import { getUser } from "../../../store/user";
import { ApplicationState, ActionType, UserState } from "../../../store/types";
import { RoutePath } from "../../../types";

import "./AccountContext.scss";
import { formatEther, BigNumberish } from "ethers/utils";
import log from "../../../utils/log";
import { Web3Provider } from "ethers/providers";
import { EthereumService } from "../../../providers/EthereumService";

type AccountContextProps = RouteComponentProps & {
  userState: UserState;
  counterfactualBalance: BigNumberish;
  getUser: (provider: Web3Provider) => void;
};

type AccountInformationProps = AccountBalanceProps & AccountUserProps;

type AccountBalanceProps = {
  balance?: string;
};

type AccountUserProps = {
  username?: string;
};

const UnauthenticatedCommands: React.FC = () => (
  <div className="btn-container">
    <FormButton className="btn">
      <img alt="" className="icon" src="/assets/icon/login.svg" />
      Login
    </FormButton>
    <FormButton className="btn btn-alternate">
      <img alt="" className="icon" src="/assets/icon/register.svg" />
      Register
    </FormButton>
  </div>
);

const AccountBalance: React.FC<AccountBalanceProps> = ({ balance }) => (
  <div className="info">
    <img alt="" className="info-img" src="/assets/icon/crypto.svg" />
    <Link to={RoutePath.SetupDeposit}>
      <div className="info-text">
        <div className="info-header">Balance</div>
        <div className="info-content">{balance} ETH</div>
      </div>
    </Link>
  </div>
);

const AccountUser: React.FC<AccountUserProps> = ({ username }) => (
  <div className="info">
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

class AccountContext extends React.Component<AccountContextProps> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  componentDidMount() {
    const { getUser } = this.props;
    const { provider } = this.context;

    getUser(provider);
  }

  componentWillReceiveProps(props: AccountContextProps) {
    const { userState, history } = props;

    if (userState.user.id && history.location.pathname === RoutePath.Root) {
      history.push(RoutePath.Channels);
    } else if (
      !userState.user.id &&
      history.location.pathname !== RoutePath.Root
    ) {
      history.push(RoutePath.Root);
    }
  }

  render() {
    const { user } = this.props.userState;
    const { counterfactualBalance } = this.props;

    log("AccountContext", this.props);

    return (
      <div className="account-context">
        {!user.id ? (
          <UnauthenticatedCommands />
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
    userState: state.UserState,
    counterfactualBalance: state.WalletState.counterfactualBalance
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    getUser: (provider: Web3Provider) => dispatch(getUser(provider))
  })
)(AccountContext);
