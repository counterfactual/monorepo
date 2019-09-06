import { EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT } from "@counterfactual/types";
import { Wallet } from "ethers";
import { fromMnemonic } from "ethers/utils/hdnode";

import { LocalGanacheServer } from "../src";

describe("Contracts get deployed as expected", () => {
  jest.setTimeout(10000);

  let chain: LocalGanacheServer;

  beforeAll(async () => {
    chain = new LocalGanacheServer([
      fromMnemonic(Wallet.createRandom().mnemonic).extendedKey
    ]);
    await chain.runMigrations();
  });

  afterAll(async () => {
    await chain.server.close();
  });

  it("can spin up a new configured chain", async () => {
    const { networkContext } = chain;

    // This is not officially part of the NetworkContext but it's deployed
    // in the context of the tests
    delete networkContext["TicTacToeApp"];
    delete networkContext["DolphinCoin"];
    delete networkContext["UnidirectionalTransferApp"];
    delete networkContext["UnidirectionalLinkedTransferApp"];
    delete networkContext["SimpleTransferApp"];

    const contractNames = new Set(Object.keys(networkContext));
    const expectedContracts = new Set(
      EXPECTED_CONTRACT_NAMES_IN_NETWORK_CONTEXT
    );

    expect(contractNames).toEqual(expectedContracts);
  });
});
