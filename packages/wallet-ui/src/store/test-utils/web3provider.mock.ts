import { One } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { BigNumber } from "ethers/utils";
import JsonRpcSignerMock from "./json-rpc-signer.mock";

export default class Web3ProviderMock extends Web3Provider {
  async getBalance(ethAddress: string): Promise<BigNumber> {
    return One;
  }

  getSigner(): JsonRpcSigner {
    return new JsonRpcSignerMock() as JsonRpcSigner;
  }
}
