import { Web3Provider } from "ethers/providers";
import { BigNumberish, parseEther } from "ethers/utils";
import { History } from "history";
import React from "react";
import { connect } from "react-redux";
import { RouteComponentProps } from "react-router-dom";
import { Action } from "redux";
import { ThunkDispatch } from "redux-thunk";
import { EthereumService } from "../../providers/EthereumService";
import {
  ActionType,
  ApplicationState,
  Deposit,
  ErrorData,
  User,
  WalletState
} from "../../store/types";
import { deposit } from "../../store/wallet/wallet";
import "./AccountBalance.scss";

export type AccountBalanceProps = RouteComponentProps & {
  deposit: (data: Deposit, provider: Web3Provider, history?: History) => void;
  user: User;
  walletState: WalletState;
  initialAmount?: number;
  error: ErrorData;
};

type AccountBalanceState = {
  loading: boolean;
  amount: BigNumberish;
};

export class AccountBalance extends React.Component<
  AccountBalanceProps,
  AccountBalanceState
> {
  static contextType = EthereumService;
  context!: React.ContextType<typeof EthereumService>;

  constructor(props: AccountBalanceProps) {
    super(props);

    this.state = {
      amount: parseEther(String(props.initialAmount || 0.1)),
      loading: false
    };
  }

  render() {
    return <></>;
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
)(AccountBalance);
