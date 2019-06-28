import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import SwapInterpreter from "@counterfactual/contracts/build/SwapInterpreter.json"
import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { Web3Provider } from "ethers/providers";
import { bigNumberify, BigNumber, defaultAbiCoder } from "ethers/utils";

import { expect } from "./utils/index";
import { AddressZero, Zero } from "ethers/constants";

type CoinBalances = {
    to: string
    coinAddress: string[]
    balance: BigNumber[]
  }

function mkAddress(prefix: string = "0xa"): string {
    return prefix.padEnd(42, "0");
  }

const DOLPHINCOIN_SUPPLY = bigNumberify(10)
  .pow(18)
  .mul(10000);

describe("Swap Interpreter", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let erc20: Contract;
  let swapInterpreter: Contract;

  function encodeState(state: CoinBalances[]) {
      return defaultAbiCoder.encode(
        [`tuple(address to, address[] coinAddress, uint256[] balance)[] coinBalances`],
        [state]    
      )
  }

  function encodeParams(params: BigNumber[]) {
      return defaultAbiCoder.encode(
          [`uint256[] limit`],
          params,
      )
  }

  async function interpretOutcomeAndExecuteEffect(state: CoinBalances[], params: BigNumber[]) {
      return await swapInterpreter.functions.interpretOutcomeAndExecuteEffect(encodeState(state), encodeParams(params))
  }

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    erc20 = await waffle.deployContract(wallet, DolphinCoin);
    swapInterpreter = await waffle.deployContract(wallet, SwapInterpreter);
  });

  describe("Interpret outcome and execute effect", () => {
    it("Eth + Token - distributes funds correctly", async () => {
        const senderAddr = mkAddress("0xa");
        const receiverAddr = mkAddress("0xb");
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
              balance: [Zero, new BigNumber(2)],
            }
          ]
        const params = [new BigNumber(100000), new BigNumber(100000)]

        const ret = await interpretOutcomeAndExecuteEffect(state, params)

    });
  });
});
