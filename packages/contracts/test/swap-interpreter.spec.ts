import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import SwapInterpreter from "@counterfactual/contracts/build/SwapInterpreter.json";
import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { BigNumber, bigNumberify, defaultAbiCoder } from "ethers/utils";

import { expect } from "./utils/index";

type CoinBalances = {
  to: string;
  coinAddress: string[];
  balance: BigNumber[];
};

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

describe("Swap Interpreter", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let erc20: Contract;
  let swapInterpreter: Contract;

  function encodeState(state: CoinBalances[]) {
    return defaultAbiCoder.encode(
      [
        `tuple(address to, address[] coinAddress, uint256[] balance)[] coinBalances`
      ],
      [state]
    );
  }

  function encodeParams(params: {limit: BigNumber[]}) {
      return defaultAbiCoder.encode(
          [`tuple(uint256[] limit)`],
          [params],
      )
  }

  async function interpretOutcomeAndExecuteEffect(state: CoinBalances[], params: {limit: BigNumber[]}) {
      return await swapInterpreter.functions.interpretOutcomeAndExecuteEffect(encodeState(state), encodeParams(params))
  }

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    erc20 = await waffle.deployContract(wallet, DolphinCoin);
    swapInterpreter = await waffle.deployContract(wallet, SwapInterpreter);
    await erc20.functions.transfer(swapInterpreter.address, erc20.functions.balanceOf(wallet.address))
  });

  describe("Interpret outcome and execute effect", () => {
    it("Eth + Token - distributes funds correctly", async () => {
        const senderAddr = wallet.address;
        const receiverAddr = mkAddress("0xa")
        const tokenAddr = erc20.address;
        const state = [
            {
              to: senderAddr,
              coinAddress: [tokenAddr, AddressZero],
              balance: [new BigNumber(500), Zero],
            },
            {
              to: receiverAddr,
              coinAddress: [tokenAddr, AddressZero],
              balance: [Zero, Zero],
            }
          ]
        const params = {
          limit: [new BigNumber(100000), new BigNumber(100000)]
        }

        await interpretOutcomeAndExecuteEffect(state, params)

        expect(await erc20.functions.balanceOf(senderAddr)).to.eq(500)
        expect(await erc20.functions.balanceOf(receiverAddr)).to.eq(0)
    });
  });
});
