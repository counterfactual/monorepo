import { Web3Provider } from "ethers/providers";
import { BigNumberish, formatEther, parseEther } from "ethers/utils";
import { History } from "history";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { FormButton, FormInput, InputChangeProps } from "../../components/form";
import { WidgetScreen } from "../../components/widget";
import { EthereumService } from "../../providers/EthereumService";
import {
  ActionType,
  ApplicationState,
  Deposit,
  ErrorData,
  User,
  WalletState
} from "../../store/types";
import { deposit, WalletDepositTransition } from "../../store/wallet/wallet";
import "./AccountDeposit.scss";

const BalanceLabel: React.FC<{ available: string }> = ({ available }) => (
  <div className="balance-label">
    <div>Available Balance</div>
    <div>{available} ETH</div>
  </div>
);

export type AccountDepositProps = RouteComponentProps & {
  deposit: (data: Deposit, provider: Web3Provider, history?: History) => void;
  user: User;
  walletState: WalletState;
  initialAmount?: number;
  error: ErrorData;
};

type AccountDepositState = {
  loading: boolean;
  amount: BigNumberish;
};

export class AccountDeposit extends React.Component<
  AccountDepositProps,
  AccountDepositState
> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  constructor(props: AccountDepositProps) {
    super(props);

    this.state = {
      amount: parseEther(String(props.initialAmount || 0.1)),
      loading: false
    };
  }

  handleChange = ({ value }: InputChangeProps) => {
    this.setState({
      ...this.state,
      amount: parseEther(value as string)
    });
  };

  buttonText = {
    [WalletDepositTransition.CheckWallet]: "Check your wallet",
    [WalletDepositTransition.WaitForFunds]: "Transfering funds"
  };

  createDepositData(
    { multisigAddress, nodeAddress, ethAddress }: User,
    amount: BigNumberish
  ): Deposit {
    return {
      nodeAddress,
      ethAddress,
      amount,
      multisigAddress: multisigAddress as string
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.error !== prevProps.error) {
      console.error(
        "AccountDeposit",
        this.props.error.message,
        this.props.error
      );
      this.setState({ ...this.state, loading: false });
    }
  }

  render() {
    const { walletState, deposit, history, user } = this.props;
    const { provider } = this.context;
    const { ethereumBalance, error, status } = walletState;
    const { amount, loading } = this.state;
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
            name="amount"
            min={0.02}
            max={Number(ethereumBalance)}
            value={formatEther(amount)}
            step={0.01}
            change={this.handleChange}
            error={error.message}
          />
          {(error.message || error.code) && !error.field ? (
            <div className="error">Ups! something broke</div>
          ) : null}
          <FormButton
            name="deposit"
            type="button"
            className="button"
            spinner={loading}
            disabled={loading}
            onClick={() => {
              this.setState({ loading: true });
              deposit(this.createDepositData(user, amount), provider, history);
            }}
          >
            {!loading ? "Proceed" : this.buttonText[status]}
          </FormButton>
        </form>
      </WidgetScreen>
    );
  }
}

export default connect(
  (state: ApplicationState) => ({
    user: state.UserState.user,
    error: state.WalletState.error,
    walletState: state.WalletState
  }),
  (dispatch: ThunkDispatch<ApplicationState, null, Action<ActionType>>) => ({
    deposit: (data: Deposit, provider: Web3Provider, history?: History) =>
      dispatch(deposit(data, provider, history))
  })
)(AccountDeposit);
