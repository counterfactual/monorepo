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
  WalletState,
  AssetType
} from "../../store/types";
import { WalletWithdrawTransition, withdraw } from "../../store/wallet/wallet";
import { RoutePath, defaultToken } from "../../types";
import "./AccountWithdraw.scss";
import { Zero } from "ethers/constants";

const BalanceLabel: React.FC<{ available: string; shortName: string }> = ({
  available,
  shortName
}) => (
  <div className="balance-label">
    <div>Available Balance</div>
    <div>
      {available} {shortName}
    </div>
  </div>
);

export type AccountWithdrawProps = RouteComponentProps & {
  withdraw: (data: Deposit, provider: Web3Provider, history?: History) => void;
  user: User;
  walletState: WalletState;
  initialAmount?: number;
  error: ErrorData;
};

type AccountWithdrawState = {
  withdrawCaseVariables: {
    halfWidget: boolean;
    header: string;
    ctaButtonText: string;
    headerDetails: string;
  };
  selectedToken: AssetType;
  withdrawableTokens: AssetType[];
  loading: boolean;
  amount: BigNumberish;
};

export class AccountWithdraw extends React.Component<
  AccountWithdrawProps,
  AccountWithdrawState
> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  constructor(props: AccountWithdrawProps) {
    super(props);
    let withdrawCaseVariables = {
      halfWidget: true,
      header: "Withdraw",
      ctaButtonText: "Withdraw",
      headerDetails: ``
    };
    if (props.history.location.pathname === RoutePath.Withdraw) {
      withdrawCaseVariables = {
        halfWidget: false,
        header: "Withdraw Funds",
        ctaButtonText: "Proceed",
        headerDetails: `Please enter how much ETH you want to withdraw:`
      };
    }
    this.state = {
      withdrawCaseVariables,
      withdrawableTokens: (
        this.props.walletState.tokenAddresses || [defaultToken]
      ).filter(token => token.counterfactualBalance),
      selectedToken:
        this.props.walletState.tokenAddresses.find(
          ({ tokenAddress: ta }) => ta === defaultToken.tokenAddress
        ) || defaultToken,
      amount: parseEther(String(props.initialAmount || 0.1)),
      loading: false
    };
  }

  handleChange = ({ value, tokenAddress }: InputChangeProps) => {
    this.setState({
      ...this.state,
      selectedToken:
        this.state.withdrawableTokens.find(
          ({ tokenAddress: ta }) => ta === tokenAddress
        ) || this.state.withdrawableTokens[0],
      amount: parseEther(value as string)
    });
  };

  buttonText = {
    [WalletWithdrawTransition.CheckWallet]: "Check your wallet",
    [WalletWithdrawTransition.WaitForFunds]: "Transfering funds"
  };

  createTransactionData(
    { multisigAddress, nodeAddress, ethAddress }: User,
    amount: BigNumberish,
    tokenAddress?: string
  ): Deposit {
    return {
      tokenAddress,
      nodeAddress,
      ethAddress,
      amount,
      multisigAddress: multisigAddress as string
    };
  }

  componentDidUpdate(prevProps) {
    if (this.props.error !== prevProps.error) {
      this.setState({ ...this.state, loading: false });
    }
    if (
      this.props.walletState.tokenAddresses[0] !==
      prevProps.walletState.tokenAddresses[0]
    ) {
      this.setState({
        ...this.state,
        withdrawableTokens: this.props.walletState.tokenAddresses.filter(
          token => token.counterfactualBalance
        ),
        selectedToken:
          this.props.walletState.tokenAddresses.find(
            ({ tokenAddress: ta }) =>
              ta === this.state.selectedToken.tokenAddress
          ) || defaultToken
      });
    }
  }

  render() {
    const { walletState, withdraw, history, user } = this.props;
    const { provider } = this.context;
    const { error, status } = walletState;
    const {
      amount,
      loading,
      withdrawCaseVariables,
      withdrawableTokens,
      selectedToken
    } = this.state;
    const {
      halfWidget,
      header,
      headerDetails,
      ctaButtonText
    } = withdrawCaseVariables;

    return (
      <WidgetScreen header={header} half={halfWidget} exitable={false}>
        <form>
          <div className="details">{headerDetails}</div>
          <FormInput
            label={
              <BalanceLabel
                available={formatEther(
                  (selectedToken && selectedToken.counterfactualBalance) || Zero
                )}
                shortName={selectedToken && selectedToken.shortName}
              />
            }
            className="input--balance"
            type="number"
            units={withdrawableTokens}
            name="amount"
            min={0.02}
            max={Number(
              (selectedToken && selectedToken.counterfactualBalance) || Zero
            )}
            value={formatEther(amount)}
            step={0.01}
            change={this.handleChange}
            error={error.message}
          />
          {(error.message || error.code) && !error.field ? (
            <div className="error">Ups! something broke</div>
          ) : null}
          <FormButton
            name="withdraw"
            type="button"
            className="button"
            spinner={loading}
            disabled={loading || !!(error.message || error.code)}
            onClick={() => {
              this.setState({ loading: true });
              withdraw(
                this.createTransactionData(
                  user,
                  amount,
                  selectedToken && selectedToken.tokenAddress
                ),
                provider,
                history
              );
            }}
          >
            {!loading ? ctaButtonText : this.buttonText[status]}
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
    withdraw: (data: Deposit, provider: Web3Provider, history?: History) =>
      dispatch(withdraw(data, provider, history))
  })
)(AccountWithdraw);
