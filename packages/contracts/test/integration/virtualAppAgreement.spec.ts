import * as ethers from "ethers";

import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

import { AbstractContract, buildArtifacts, expect } from "../../utils";

/*
This test deploys VirtualAppAgreement.sol as well as fixture apps (TBD) as targets
to test the virtual app functionality.
*/

contract("Virtual App", (accounts: string[]) => {
  let game: ethers.Contract;
  let fixedResolutionApp: ethers.Contract;

  // @ts-ignore
  before(async () => {
    game = await (await buildArtifacts.VirtualAppAgreement).deploy(
      unlockedAccount
    );
    fixedResolutionApp = await (await AbstractContract.fromArtifactName(
      "FixedResolutionApp",
      {
        Transfer: buildArtifacts.Transfer
      }
    )).deploy(unlockedAccount);
  });

  describe("test", () => {
    it("test", async () => {
      expect(fixedResolutionApp);
      expect(game);
    });
  });
});
