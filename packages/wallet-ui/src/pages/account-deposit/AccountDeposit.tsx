import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import { ThunkDispatch } from "redux-thunk";
import { Action } from "redux";
import { parseEther, formatEther } from "ethers/utils";

import { WidgetScreen } from "../../components/widget";
import { FormInput, FormButton } from "../../components/form";

import {
  ApplicationState,
  ActionType,
  Deposit,
  UserState
} from "../../store/types";
import { deposit } from "../../store/wallet";

import "./AccountDeposit.scss";

const BalanceLabel: React.FC<{ available: string }> = ({ available }) => (
  <div className="balance-label">
    <div>Available Balance</div>
    <div>{available} ETH</div>
  </div>
);

type AccountDepositProps = RouteComponentProps & {
  deposit: (data: Deposit) => void;
  userState: UserState;
  initialAmount: number;
};

type AccountDepositState = Deposit;

class AccountDeposit extends React.Component<
  AccountDepositProps,
  AccountDepositState
> {
  constructor(props: AccountDepositProps) {
    super(props);

    const { initialAmount, userState } = props;
    const { user } = userState;
    const { multisigAddress, nodeAddress } = user;

    this.state = {
      nodeAddress,
      amount: parseEther(String(initialAmount || 0.1)),
      multisigAddress: multisigAddress as string
    };
  }

  handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    this.setState({
      ...this.state,
      amount: parseEther(event.target.value)
    });
  };

  render() {
    const { userState, deposit } = this.props;
    const { balance } = userState.user;

    return (
      <WidgetScreen header={"Fund your account"} exitable={false}>
        <form>
          <div className="details">
            In order to use State Channel apps, you need to deposit funds into
            your account. Please enter how much ETH you want to deposit:
          </div>
          <FormInput
            label={<BalanceLabel available="2.13" />}
            className="input--balance"
            type="number"
            unit="ETH"
            min={0.1}
            max={Number(balance)}
            value={formatEther(this.state.amount)}
            step={0.01}
            change={this.handleChange}
          />
          <FormButton
            type="button"
            className="button"
            onClick={() => deposit(this.state)}
          >
            Proceed
          </FormButton>
        </form>
      </WidgetScreen>
    );
  }
}

export default connect(
  (state: ApplicationState) => ({
    userState: state.UserState
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    deposit: (data: Deposit) => dispatch(deposit(data))
  })
)(AccountDeposit);
