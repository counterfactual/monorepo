import { IpcProvider } from "web3/providers";
import { AsyncSendable, Web3Provider, JsonRpcSigner } from "ethers/providers";

export enum RoutePath {
  Root = "/",
  SetupRegister = "/setup/register",
  SetupDeposit = "/setup/deposit",
  Channels = "/channels"
}

export type EthereumServiceContext = {
  provider: Web3Provider;
  signer: JsonRpcSigner;
};

export enum CounterfactualMethod {
  GetNodeAddress = "counterfactual:get:nodeAddress",
  SetUser = "counterfactual:set:user",
  RequestUser = "counterfactual:request:user",
  RequestDeposit = "counterfactual:request:deposit",
  RequestBalances = "counterfactual:request:balances"
}

export enum CounterfactualEvent {
  CreateChannel = "counterfactual:listen:createChannel",
  RequestDepositStart = "counterfactual:request:deposit_start"
}

declare global {
  interface Window {
    ethereum: IpcProvider &
      AsyncSendable & {
        enable: () => Promise<void>;
        selectedAddress: string;
        networkVersion: string;
        send: (
          eventOrMethod: CounterfactualMethod | CounterfactualEvent,
          data?: any[]
        ) => Promise<any>;
      };

    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: (...args: any[]) => any;
  }
}
