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
  AssetType,
  Deposit,
  ErrorData,
  User,
  WalletState
} from "../../store/types";
import { WalletDepositTransition, deposit } from "../../store/wallet/wallet";
import { defaultToken, RoutePath } from "../../types";
import { getFormattedBalanceFrom } from "../../utils/nodeTokenClient";
import "./AccountDeposit.scss";

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

export type AccountDepositProps = RouteComponentProps & {
  deposit: (data: Deposit, provider: Web3Provider, history?: History) => void;
  user: User;
  walletState: WalletState;
  initialAmount?: number;
  error?: ErrorData;
};

type AccountDepositState = {
  depositCaseVariables: {
    halfWidget: boolean;
    header: string;
    ctaButtonText: string;
    headerDetails: string;
  };
  selectedToken: AssetType;
  depositableTokens: AssetType[];
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

    let depositCaseVariables = {
      halfWidget: true,
      header: "Deposit",
      ctaButtonText: "Deposit",
      headerDetails: ``
    };
    if (props.history.location.pathname === RoutePath.SetupDeposit) {
      depositCaseVariables = {
        halfWidget: false,
        header: "Fund your account",
        ctaButtonText: "Proceed",
        headerDetails: `In order to use State Channel apps, you need to deposit funds into your account.
      Please enter how much ETH you want to deposit:`
      };
    }
    this.state = {
      depositCaseVariables,
      depositableTokens: (
        this.props.walletState.tokenAddresses || [defaultToken]
      ).filter(token => token.walletBalance !== "0"),
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
        this.state.depositableTokens.find(
          ({ tokenAddress: ta }) => ta === tokenAddress
        ) || this.state.depositableTokens[0],
      amount: parseEther(value as string)
    });
  };

  buttonText = {
    [WalletDepositTransition.CheckWallet]: "Check your wallet",
    [WalletDepositTransition.WaitForUserFunds]: "Transferring funds",
    [WalletDepositTransition.WaitForCollateralFunds]: "Collateralizing deposit"
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
        depositableTokens: this.props.walletState.tokenAddresses.filter(
          token => token.walletBalance !== "0"
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
    const { walletState, deposit, history, user } = this.props;
    const { provider } = this.context;
    const { error, status } = walletState;
    const {
      amount,
      loading,
      depositCaseVariables,
      depositableTokens,
      selectedToken
    } = this.state;
    const {
      halfWidget,
      header,
      headerDetails,
      ctaButtonText
    } = depositCaseVariables;
    const availableBalance = getFormattedBalanceFrom(
      [selectedToken],
      0,
      "walletBalance"
    );

    return (
      <WidgetScreen header={header} half={halfWidget} exitable={false}>
        <form>
          <div className="details">{headerDetails}</div>
          <FormInput
            label={
              <BalanceLabel
                available={availableBalance}
                shortName={(selectedToken && selectedToken.shortName) || "ETH"}
              />
            }
            className="input--balance"
            type="number"
            units={depositableTokens}
            name="amount"
            min={0.02}
            max={Number(availableBalance)}
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
            disabled={loading || !!(error.message || error.code)}
            onClick={() => {
              this.setState({ loading: true });
              deposit(
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
    deposit: (data: Deposit, provider: Web3Provider, history?: History) =>
      dispatch(deposit(data, provider, history))
  })
)(AccountDeposit);
