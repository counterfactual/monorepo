import CoinTransferListOfListsInterpreter from "@counterfactual/contracts/build/CoinTransferListOfListsInterpreter.json";
import DolphinCoin from "@counterfactual/contracts/build/DolphinCoin.json";
import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { AddressZero, One } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { BigNumber, defaultAbiCoder, hexlify, randomBytes } from "ethers/utils";

import { expect } from "./utils/index";

type CoinTransfer = {
  to: string;
  amount: BigNumber;
};

type CoinTransferListOfLists = {
  transfers: CoinTransfer[][];
};

function encodeParams(params: {
  limit: BigNumber[];
  tokenAddresses: string[];
}) {
  return defaultAbiCoder.encode(
    [`tuple(uint256[] limit, address[] tokenAddresses)`],
    [params]
  );
}

function encodeOutcome(outcome: CoinTransferListOfLists) {
  return defaultAbiCoder.encode(
    [
      `
        tuple(
          tuple(
            address to,
            uint256 amount
          )[][] transfers
        )
      `
    ],
    [outcome]
  );
}

describe("CoinTransferInterpreter", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let erc20: Contract;
  let coinTransferInterpreter: Contract;

  async function interpretOutcomeAndExecuteEffect(
    outcome: CoinTransferListOfLists,
    params: { limit: BigNumber[]; tokenAddresses: string[] }
  ) {
    return await coinTransferInterpreter.functions.interpretOutcomeAndExecuteEffect(
      encodeOutcome(outcome),
      encodeParams(params)
    );
  }

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    erc20 = await waffle.deployContract(wallet, DolphinCoin);

    coinTransferInterpreter = await waffle.deployContract(
      wallet,
      CoinTransferListOfListsInterpreter
    );

    // fund interpreter with ERC20 tokenAddresses
    await erc20.functions.transfer(
      coinTransferInterpreter.address,
      erc20.functions.balanceOf(wallet.address)
    );

    // fund interpreter with ETH
    await wallet.sendTransaction({
      to: coinTransferInterpreter.address,
      value: new BigNumber(100)
    });
  });

  it("Can distribute ETH coins only correctly to one person", async () => {
    const to = hexlify(randomBytes(20));
    const amount = One;

    await interpretOutcomeAndExecuteEffect(
      { transfers: [[{ to, amount }]] },
      {
        limit: [amount],
        tokenAddresses: [AddressZero]
      }
    );

    expect(await provider.getBalance(to)).to.eq(One);
  });

  it("Can distribute ETH coins only correctly two people", async () => {
    const to1 = hexlify(randomBytes(20));
    const amount1 = One;

    const to2 = hexlify(randomBytes(20));
    const amount2 = One;

    await interpretOutcomeAndExecuteEffect(
      {
        transfers: [
          [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }]
        ]
      },
      {
        limit: [amount1.add(amount2)],
        tokenAddresses: [AddressZero]
      }
    );

    expect(await provider.getBalance(to1)).to.eq(One);
    expect(await provider.getBalance(to2)).to.eq(One);
  });

  it("Can distribute ERC20 coins correctly for one person", async () => {
    const to = hexlify(randomBytes(20));
    const amount = One;

    await interpretOutcomeAndExecuteEffect(
      { transfers: [[{ to, amount }]] },
      {
        limit: [amount],
        tokenAddresses: [erc20.address]
      }
    );

    expect(await erc20.functions.balanceOf(to)).to.eq(One);
  });

  it("Can distribute ERC20 coins only correctly two people", async () => {
    const to1 = hexlify(randomBytes(20));
    const amount1 = One;

    const to2 = hexlify(randomBytes(20));
    const amount2 = One;

    await interpretOutcomeAndExecuteEffect(
      {
        transfers: [
          [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }]
        ]
      },
      {
        limit: [amount1.add(amount2)],
        tokenAddresses: [erc20.address]
      }
    );

    expect(await erc20.functions.balanceOf(to1)).to.eq(One);
    expect(await erc20.functions.balanceOf(to2)).to.eq(One);
  });

  it("Can distribute both ETH and ERC20 coins to one person", async () => {
    const to = hexlify(randomBytes(20));
    const amount = One;

    await interpretOutcomeAndExecuteEffect(
      { transfers: [[{ to, amount }], [{ to, amount }]] },
      {
        limit: [amount, amount],
        tokenAddresses: [AddressZero, erc20.address]
      }
    );

    expect(await provider.getBalance(to)).to.eq(One);
    expect(await erc20.functions.balanceOf(to)).to.eq(One);
  });

  it("Can distribute a split of ETH and ERC20 coins to two people", async () => {
    const to1 = hexlify(randomBytes(20));
    const amount1 = One;

    const to2 = hexlify(randomBytes(20));
    const amount2 = One;

    await interpretOutcomeAndExecuteEffect(
      {
        transfers: [
          [{ to: to1, amount: amount1 }],
          [{ to: to2, amount: amount2 }]
        ]
      },
      {
        limit: [amount1, amount2],
        tokenAddresses: [AddressZero, erc20.address]
      }
    );

    expect(await provider.getBalance(to1)).to.eq(One);
    expect(await erc20.functions.balanceOf(to2)).to.eq(One);
  });

  it("Can distribute a mix of ETH and ERC20 coins to two people", async () => {
    const to1 = hexlify(randomBytes(20));
    const amount1 = One;

    const to2 = hexlify(randomBytes(20));
    const amount2 = One;

    await interpretOutcomeAndExecuteEffect(
      {
        transfers: [
          [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }],
          [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }]
        ]
      },
      {
        limit: [amount1.add(amount2), amount1.add(amount2)],
        tokenAddresses: [AddressZero, erc20.address]
      }
    );

    expect(await provider.getBalance(to1)).to.eq(One);
    expect(await erc20.functions.balanceOf(to1)).to.eq(One);

    expect(await provider.getBalance(to2)).to.eq(One);
    expect(await erc20.functions.balanceOf(to2)).to.eq(One);
  });

  it("Can distribute a mix of ETH and ERC20 coins to an unorderded list of people", async () => {
    const to1 = hexlify(randomBytes(20));
    const amount1 = One;

    const to2 = hexlify(randomBytes(20));
    const amount2 = One;

    await interpretOutcomeAndExecuteEffect(
      {
        transfers: [
          [{ to: to2, amount: amount2 }, { to: to1, amount: amount1 }],
          [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }]
        ]
      },
      {
        limit: [amount1.add(amount2), amount1.add(amount2)],
        tokenAddresses: [AddressZero, erc20.address]
      }
    );

    expect(await provider.getBalance(to1)).to.eq(One);
    expect(await erc20.functions.balanceOf(to1)).to.eq(One);

    expect(await provider.getBalance(to2)).to.eq(One);
    expect(await erc20.functions.balanceOf(to2)).to.eq(One);
  });
});
