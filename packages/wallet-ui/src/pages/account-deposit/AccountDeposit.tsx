import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import { ThunkDispatch } from "redux-thunk";
import { Action } from "redux";
import { parseEther, formatEther } from "ethers/utils";

import { WidgetScreen } from "../../components/widget";
import { FormInput, FormButton, InputChangeProps } from "../../components/form";

import {
  ApplicationState,
  ActionType,
  Deposit,
  UserState,
  WalletState
} from "../../store/types";
import { deposit } from "../../store/wallet";

import "./AccountDeposit.scss";
import { EthereumService } from "../../providers/EthereumService";
import { Web3Provider } from "ethers/providers";
import { History } from "history";

const BalanceLabel: React.FC<{ available: string }> = ({ available }) => (
  <div className="balance-label">
    <div>Available Balance</div>
    <div>{available} ETH</div>
  </div>
);

type AccountDepositProps = RouteComponentProps & {
  deposit: (data: Deposit, provider: Web3Provider, history?: History) => void;
  userState: UserState;
  walletState: WalletState;
  initialAmount: number;
};

type AccountDepositState = Deposit;

class AccountDeposit extends React.Component<
  AccountDepositProps,
  AccountDepositState
> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  constructor(props: AccountDepositProps) {
    super(props);

    const { initialAmount, userState } = props;
    const { user } = userState;
    const { multisigAddress, nodeAddress, ethAddress } = user;

    this.state = {
      nodeAddress,
      ethAddress,
      amount: parseEther(String(initialAmount || 0.1)),
      multisigAddress: multisigAddress as string
    };
  }

  handleChange = ({ value }: InputChangeProps) => {
    this.setState({
      ...this.state,
      amount: parseEther(value as string)
    });
  };

  render() {
    const { walletState, deposit, history } = this.props;
    const { provider } = this.context;
    const { ethereumBalance, error } = walletState;
    const { amount } = this.state;

    return (
      <WidgetScreen header={"Fund your account"} exitable={false}>
        <form>
          <div className="details">
            In order to use State Channel apps, you need to deposit funds into
            your account. Please enter how much ETH you want to deposit:
          </div>
          <FormInput
            label={<BalanceLabel available={formatEther(ethereumBalance)} />}
            className="input--balance"
            type="number"
            unit="ETH"
            min={0.02}
            max={Number(ethereumBalance)}
            value={formatEther(amount)}
            step={0.01}
            change={this.handleChange}
            error={error.message}
          />
          <FormButton
            type="button"
            className="button"
            onClick={() => deposit(this.state, provider, history)}
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
    userState: state.UserState,
    walletState: state.WalletState
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    deposit: (data: Deposit, provider: Web3Provider, history?: History) =>
      dispatch(deposit(data, provider, history))
  })
)(AccountDeposit);
