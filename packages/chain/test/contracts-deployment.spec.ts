import { networkContextProps } from "@counterfactual/types";
import { Wallet } from "ethers";

import { Chain } from "../src";

describe("Contracts get deployed as expected", () => {
  it("can spin up a new configured chain", async () => {
    console.log("initiating");
    const chain = new Chain([Wallet.createRandom().mnemonic]);
    const contractDeployments = await chain.createConfiguredChain();

    // This is not officially part of the NetworkContext but it's deployed
    // in the context of the tests
    delete contractDeployments["TicTacToe"];

    const contractNames = new Set(Object.keys(contractDeployments));
    const expectedContracts = new Set(networkContextProps);
    expect(contractNames).toEqual(expectedContracts);
  });
});
