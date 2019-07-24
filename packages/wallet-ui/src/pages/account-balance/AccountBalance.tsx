import React from "react";
import { RouteComponentProps } from "react-router-dom";
import AccountDeposit from "../account-deposit/AccountDeposit";
import AccountWithdraw from "../account-withdraw/AccountWithdraw";

const AccountBalance: React.FC<RouteComponentProps> = props => {
  return (
    <>
      <AccountDeposit {...props}></AccountDeposit>
      <AccountWithdraw {...props}></AccountWithdraw>
    </>
  );
};

export default AccountBalance;
