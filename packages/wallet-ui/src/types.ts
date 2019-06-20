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

declare global {
  interface Window {
    ethereum: IpcProvider &
      AsyncSendable & {
        enable: () => Promise<void>;
        selectedAddress: string;
        networkVersion: string;
      };

    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: (...args: any[]) => any;
  }
}
