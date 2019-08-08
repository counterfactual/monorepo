import { Node } from "@counterfactual/types";
import { IpcProvider, JsonRPCResponse } from "web3/providers";

export type EthereumGlobal = Omit<IpcProvider, "send"> & {
  enable: () => Promise<void>;
  selectedAddress: string;
  networkVersion: string;
  send: (
    eventOrMethod: string,
    data?: any[]
  ) => Promise<JsonRPCResponse & { result: Node.Message }>;
};
