import { AsyncSendable, JsonRpcSigner, Web3Provider } from "ethers/providers";
import { IpcProvider, JsonRPCResponse } from "web3/providers";

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
  RequestBalances = "counterfactual:request:balances",
  RequestChannels = "counterfactual:request:channels",
  RequestChannel = "counterfactual:request:channel"
}

export enum CounterfactualEvent {
  CreateChannel = "counterfactual:listen:createChannel",
  RequestDepositStart = "counterfactual:request:deposit_start"
}

export type EthereumGlobal = Omit<IpcProvider, "send"> &
  Omit<AsyncSendable, "send"> & {
    enable: () => Promise<void>;
    selectedAddress: string;
    networkVersion: string;
    send: (
      eventOrMethod: CounterfactualMethod | CounterfactualEvent,
      data?: any[]
    ) => Promise<JsonRPCResponse>;
  };

declare global {
  interface Window {
    ethereum: EthereumGlobal;
  }
}
