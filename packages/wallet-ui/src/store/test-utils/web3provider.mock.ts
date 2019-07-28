import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { BigNumber } from "ethers/utils";
import { ETHEREUM_MOCK_BALANCE } from "./ethereum.mock";
import JsonRpcSignerMock from "./json-rpc-signer.mock";

export default class Web3ProviderMock extends Web3Provider {
  // @ts-ignore
  async getBalance(ethAddress: string): Promise<BigNumber> {
    return ETHEREUM_MOCK_BALANCE;
  }

  getSigner(): JsonRpcSigner {
    return new JsonRpcSignerMock() as JsonRpcSigner;
  }
}
