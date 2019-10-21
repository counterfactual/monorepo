import DolphinCoin from "../expected-build-artifacts/DolphinCoin.json";
import MultiAssetMultiPartyCoinTransferInterpreter from "../expected-build-artifacts/MultiAssetMultiPartyCoinTransferInterpreter.json";
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

function encodeParams(params: {
  limit: BigNumber[];
  tokenAddresses: string[];
}) {
  return defaultAbiCoder.encode(
    [`tuple(uint256[] limit, address[] tokenAddresses)`],
    [params]
  );
}

function encodeOutcome(state: CoinTransfer[][]) {
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

describe("MultiAssetMultiPartyCoinTransferInterpreter", () => {
  let provider: Web3Provider;
  let wallet: Wallet;
  let erc20: Contract;
  let multiAssetMultiPartyCoinTransferInterpreter: Contract;

  async function interpretOutcomeAndExecuteEffect(
    state: CoinTransfer[][],
    params: { limit: BigNumber[]; tokenAddresses: string[] }
  ) {
    return await multiAssetMultiPartyCoinTransferInterpreter.functions.interpretOutcomeAndExecuteEffect(
      encodeOutcome(state),
      encodeParams(params)
    );
  }

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    erc20 = await waffle.deployContract(wallet, DolphinCoin);

    multiAssetMultiPartyCoinTransferInterpreter = await waffle.deployContract(
      wallet,
      MultiAssetMultiPartyCoinTransferInterpreter
    );

    // fund interpreter with ERC20 tokenAddresses
    await erc20.functions.transfer(
      multiAssetMultiPartyCoinTransferInterpreter.address,
      erc20.functions.balanceOf(wallet.address)
    );

    // fund interpreter with ETH
    await wallet.sendTransaction({
      to: multiAssetMultiPartyCoinTransferInterpreter.address,
      value: new BigNumber(100)
    });
  });

  it("Can distribute ETH coins only correctly to one person", async () => {
    const to = hexlify(randomBytes(20));
    const amount = One;

    await interpretOutcomeAndExecuteEffect([[{ to, amount }]], {
      limit: [amount],
      tokenAddresses: [AddressZero]
    });

    expect(await provider.getBalance(to)).to.eq(One);
  });

  it("Can distribute ETH coins only correctly two people", async () => {
    const to1 = hexlify(randomBytes(20));
    const amount1 = One;

    const to2 = hexlify(randomBytes(20));
    const amount2 = One;

    await interpretOutcomeAndExecuteEffect(
      [[{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }]],
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

    await interpretOutcomeAndExecuteEffect([[{ to, amount }]], {
      limit: [amount],
      tokenAddresses: [erc20.address]
    });

    expect(await erc20.functions.balanceOf(to)).to.eq(One);
  });

  it("Can distribute ERC20 coins only correctly two people", async () => {
    const to1 = hexlify(randomBytes(20));
    const amount1 = One;

    const to2 = hexlify(randomBytes(20));
    const amount2 = One;

    await interpretOutcomeAndExecuteEffect(
      [[{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }]],
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
      [[{ to, amount }], [{ to, amount }]],
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
      [[{ to: to1, amount: amount1 }], [{ to: to2, amount: amount2 }]],
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
      [
        [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }],
        [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }]
      ],
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
      [
        [{ to: to2, amount: amount2 }, { to: to1, amount: amount1 }],
        [{ to: to1, amount: amount1 }, { to: to2, amount: amount2 }]
      ],
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
