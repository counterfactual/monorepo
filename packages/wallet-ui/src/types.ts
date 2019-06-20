import { IpcProvider, JsonRPCRequest, JsonRPCResponse } from "web3/providers";

export enum RoutePath {
  Root = "/",
  SetupRegister = "/setup/register",
  SetupDeposit = "/setup/deposit",
  Channels = "/channels"
}

declare global {
  interface Window {
    ethereum: IpcProvider & {
      enable: () => Promise<void>;
      selectedAddress: string;
      networkVersion: string;
      sendAsync: (
        payload: JsonRPCRequest,
        callback: (data: JsonRPCResponse) => void
      ) => void;
    };

    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__: (...args: any[]) => any;
  }
}
