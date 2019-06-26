import React from "react";

import { WidgetScreen } from "../../components/widget";
import { FormInput, FormButton } from "../../components/form";

import { Link } from "react-router-dom";

import "./AccountDeposit.scss";

const BalanceLabel: React.FC<{ available: string }> = ({ available }) => (
  <div className="balance-label">
    <div>Available Balance</div>
    <div>{available} ETH</div>
  </div>
);

export class AccountDeposit extends React.Component {
  render() {
    return (
      <WidgetScreen header={"Fund your account"} exitable={false}>
        <form onSubmit={async e => console.log(e)}>
          <div className="details">
            In order to use State Channel apps, you need to deposit funds into
            your account. Please enter how much ETH you want to deposit:
          </div>
          <FormInput
            label={<BalanceLabel available="2.13" />}
            className="input--balance"
            type="number"
            unit="ETH"
            min={0}
            value={2.13}
            step={0.01}
            change={(event, error) => {
              console.log(event, error);
            }}
          />
          {/* TODO: This should actually make a deposit
         before transitioning to /channels */}
          <Link to="/channels">
            <FormButton type="button" className="button">
              Proceed
            </FormButton>
          </Link>
        </form>
      </WidgetScreen>
    );
  }
}
