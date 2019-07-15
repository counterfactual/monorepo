import { One } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { BigNumber } from "ethers/utils";

export default class Web3ProviderMock extends Web3Provider {
  async getBalance(ethAddress: string): Promise<BigNumber> {
    return One;
  }
}
