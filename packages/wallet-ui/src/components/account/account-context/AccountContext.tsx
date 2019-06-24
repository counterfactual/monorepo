import React from "react";
import { Action } from "redux";
import { connect } from "react-redux";
import { ThunkDispatch } from "redux-thunk";
import { RouteComponentProps } from "react-router-dom";

import { FormButton } from "../../form";
import { getUser } from "../../../store/user";
import { ApplicationState, ActionType, UserState } from "../../../store/types";
import { RoutePath } from "../../../types";

import "./AccountContext.scss";

type AccountContextProps = RouteComponentProps & {
  userState: UserState;
  getUser: () => void;
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
    <div className="info-text">
      <div className="info-header">Balance</div>
      <div className="info-content">{balance} ETH</div>
    </div>
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
  constructor(props: AccountContextProps) {
    super(props);

    const { getUser } = props;

    getUser();
  }

  componentWillReceiveProps(props: AccountContextProps) {
    const { userState, history } = this.props;

    if (userState && userState.user && userState.user.id) {
      history.push(RoutePath.Channels);
    }
  }

  render() {
    const { user } = this.props.userState;

    return (
      <div className="account-context">
        {!user ? (
          <UnauthenticatedCommands />
        ) : (
          <AccountInformation username={user.username} balance={user.balance} />
        )}
      </div>
    );
  }
}

export default connect(
  (state: ApplicationState) => ({
    userState: state.UserState
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    getUser: () => dispatch(getUser())
  })
)(AccountContext);
