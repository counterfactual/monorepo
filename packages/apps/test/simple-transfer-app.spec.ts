import chai from "chai";
import * as waffle from "ethereum-waffle";
import { Contract } from "ethers";
import { Zero } from "ethers/constants";
import { BigNumber, defaultAbiCoder } from "ethers/utils";

import SimpleTransferApp from "../expected-build-artifacts/SimpleTransferApp.json";

chai.use(waffle.solidity);

type CoinTransfer = {
  to: string;
  amount: BigNumber;
};

type SimpleTransferAppState = {
  coinTransfers: CoinTransfer[];
};

const { expect } = chai;

const multiAssetMultiPartyCoinTransferEncoding = `
  tuple(address to, uint256 amount)[2]
`;

const transferAppStateEncoding = `tuple(
  ${multiAssetMultiPartyCoinTransferEncoding} coinTransfers
)`;

function mkAddress(prefix: string = "0xa"): string {
  return prefix.padEnd(42, "0");
}

// FIXME: why does this have to use the multiAsset one?
const decodeAppState = (encodedAppState: string): CoinTransfer[] =>
  defaultAbiCoder.decode(
    [multiAssetMultiPartyCoinTransferEncoding],
    encodedAppState
  )[0];

const encodeAppState = (
  state: SimpleTransferAppState,
  onlyCoinTransfers: boolean = false
): string => {
  if (!onlyCoinTransfers) {
    return defaultAbiCoder.encode([transferAppStateEncoding], [state]);
  }
  return defaultAbiCoder.encode(
    [multiAssetMultiPartyCoinTransferEncoding],
    [state.coinTransfers]
  );
};

describe("SimpleTransferApp", () => {
  let simpleTransferApp: Contract;

  async function computeOutcome(
    state: SimpleTransferAppState
  ): Promise<string> {
    return await simpleTransferApp.functions.computeOutcome(
      encodeAppState(state)
    );
  }

  before(async () => {
    const provider = waffle.createMockProvider();
    const wallet = (await waffle.getWallets(provider))[0];
    simpleTransferApp = await waffle.deployContract(wallet, SimpleTransferApp);
  });

  describe("update state", () => {
    it("can compute outcome with update", async () => {
      const senderAddr = mkAddress("0xa");
      const receiverAddr = mkAddress("0xB");
      const transferAmount = new BigNumber(10000);

      const preState: SimpleTransferAppState = {
        coinTransfers: [
          {
            amount: transferAmount,
            to: senderAddr
          },
          {
            amount: Zero,
            to: receiverAddr
          }
        ]
      };

      const state: SimpleTransferAppState = {
        coinTransfers: [
          {
            amount: Zero,
            to: senderAddr
          },
          {
            amount: transferAmount,
            to: receiverAddr
          }
        ]
      };

      const ret = await computeOutcome(preState);
      expect(ret).to.eq(encodeAppState(state, true));
      const decoded = decodeAppState(ret);
      expect(decoded[0].to).eq(state.coinTransfers[0].to);
      expect(decoded[0].amount.toString()).eq(
        state.coinTransfers[0].amount.toString()
      );
      expect(decoded[1].to).eq(state.coinTransfers[1].to);
      expect(decoded[1].amount.toString()).eq(
        state.coinTransfers[1].amount.toString()
      );
    });
  });
});
