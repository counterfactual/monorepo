import CoinTransferInterpreter from "@counterfactual/contracts/build/CoinTransferInterpreter.json";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { AddressZero, Zero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import { expect } from "./utils/index";

type CoinTransfer = {
  to: string;
  amount: BigNumber;
};

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

describe("Swap Interpreter", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let erc20: Contract;
  let coinTransferInterpreter: Contract;

  function encodeState(state: CoinTransfer[][]) {
    return defaultAbiCoder.encode(
      [
        `
          tuple(
            address to,
            uint256 amount
          )[][]
        `
      ],
      [state]
    );
  }

  function encodeParams(params: { limit: BigNumber[]; tokenAddresses: string[] }) {
    return defaultAbiCoder.encode(
      [`tuple(uint256[] limit, address[] tokenAddresses)`],
      [params]
    );
  }

  async function interpretOutcomeAndExecuteEffect(
    state: CoinTransfer[][],
    params: { limit: BigNumber[]; tokenAddresses: string[] }
  ) {
    return await coinTransferInterpreter.functions.interpretOutcomeAndExecuteEffect(
      encodeState(state),
      encodeParams(params)
    );
  }

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    erc20 = await waffle.deployContract(wallet, DolphinCoin);
    coinTransferInterpreter = await waffle.deployContract(
      wallet,
      CoinTransferInterpreter
    );

    // fund interpreter with ERC20 tokenAddresses
    await erc20.functions.transfer(
      coinTransferInterpreter.address,
      erc20.functions.balanceOf(wallet.address)
    );
  });

  describe("Interpret outcome and execute effect", () => {
    it("Eth + Token - distributes funds correctly", async () => {
      const sendETHReceiveERC20Addr = wallet.address;
      const sendERC20ReceiveETHAddr = mkAddress("0xa");
      const tokenAddr = erc20.address;
      const state = [
        // ETH
        [
          {
            to: sendETHReceiveERC20Addr,
            amount: new BigNumber(500)
          },
          {
            to: sendERC20ReceiveETHAddr,
            amount: Zero
          }
        ],
        // ERC20 token
        [
          {
            to: sendERC20ReceiveETHAddr,
            amount: Zero
          },
          {
            to: sendETHReceiveERC20Addr,
            amount: new BigNumber(500)
          }
        ]
      ];

      const params = {
        limit: [new BigNumber(100000), new BigNumber(100000)],
        tokenAddresses: [AddressZero, tokenAddr]
      };

      await interpretOutcomeAndExecuteEffect(state, params);

      expect(await erc20.functions.balanceOf(sendERC20ReceiveETHAddr)).to.eq(0);
      expect(await erc20.functions.balanceOf(sendETHReceiveERC20Addr)).to.eq(
        500
      );
    });
  });
});
