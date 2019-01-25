import { UserSession } from "@counterfactual/playground-server";
import { Component, Element, Prop, State } from "@stencil/core";

import AccountTunnel from "../../../data/account";

interface TransactionArgs {
  from: string;
  to: string;
  value: string;
}

@Component({
  tag: "account-exchange",
  styleUrl: "account-exchange.scss",
  shadow: true
})
export class AccountExchange {
  @Element() el!: HTMLStencilElement;
  @Prop() user: UserSession = {} as UserSession;
  @Prop() balance: number = 0;
  @Prop() accountBalance: number = 0;
  @Prop() updateAccount: (e) => void = e => {};
  @State() depositValue: number | string = "";
  @State() withdrawValue: number | string = "";

  depositTimeoutId: NodeJS.Timeout | undefined;

  deposit(e) {
    const value = e.target.value;
    const wei = ethers.utils.parseEther(value).toString();
    const transactionArgs = {
      from: this.user.ethAddress,
      to: this.user.multisigAddress,
      value: wei
    };
    this.initiateTransaction(parseFloat(value), transactionArgs);

    this.depositValue = "";
  }

  withdraw(e) {
    const value = e.target.value;
    const wei = ethers.utils.parseEther(value).toString();
    const transactionArgs = {
      from: this.user.multisigAddress,
      to: this.user.ethAddress,
      value: wei
    };
    this.initiateTransaction(-parseFloat(value), transactionArgs);

    this.withdrawValue = "";
  }

  initiateTransaction(value: number, transactionArgs: TransactionArgs) {
    this.updateAccount({
      balance: this.balance + value,
      accountBalance: this.accountBalance - value
    });

    const timeoutId = setTimeout(() => {
      this.displayTransactionError();
      this.updateAccount({
        balance: this.balance - value,
        accountBalance: this.accountBalance + value
      });
    }, 60000);

    web3.eth.sendTransaction(
      transactionArgs,
      this.transactionCompleted.bind(this, timeoutId)
    );
  }

  transactionCompleted(transactionTimeoutId: NodeJS.Timeout) {
    clearTimeout(transactionTimeoutId);
    this.removeError();
  }

  displayTransactionError() {
    this.updateAccountBalance();
    this.updateAccount({
      error: {
        primary: "Transaction Failed",
        secondary: "Consult Metamask for more details"
      }
    });
  }

  updateAccountBalance() {
    web3.eth.getBalance(
      this.user.ethAddress,
      web3.eth.defaultBlock,
      (err, result) => {
        const accountBalance = parseFloat(
          ethers.utils.formatEther(result.toString())
        );

        this.updateAccount({
          accountBalance
        });
      }
    );
  }

  removeError() {
    this.updateAccount({
      error: null
    });
  }

  render() {
    return [
      <layout-header />,
      <div class="form-containers">
        <div class="form-container">
          <widget-header>Deposit</widget-header>
          <account-eth-form
            onSubmit={e => this.deposit(e)}
            button="Deposit"
            available={this.accountBalance}
            value={this.depositValue}
          />
        </div>

        <div class="form-container">
          <widget-header>Withdraw</widget-header>
          <account-eth-form
            onSubmit={e => this.withdraw(e)}
            button="Withdraw"
            available={this.balance}
            value={this.withdrawValue}
            disabled={true}
          />
        </div>
      </div>
    ];
  }
}

AccountTunnel.injectProps(AccountExchange, [
  "accountBalance",
  "balance",
  "updateAccount",
  "user"
]);
