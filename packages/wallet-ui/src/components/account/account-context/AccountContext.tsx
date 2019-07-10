import React from "react";
import { FormButton } from "../../form";

import "./AccountContext.scss";

type AccountContextProps = {
  isAuthenticated?: boolean;
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
      <div className="info-content">{balance}</div>
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

export class AccountContext extends React.Component<AccountContextProps> {
  render() {
    const { isAuthenticated } = this.props;
    return (
      <div className="account-context">
        {!isAuthenticated ? (
          <UnauthenticatedCommands />
        ) : (
          <AccountInformation
            username="JoelAlejandroVillarrealBertoldiDeLasColinasDeAzeroth"
            balance="1.23 ETH"
          />
        )}
      </div>
    );
  }
}
