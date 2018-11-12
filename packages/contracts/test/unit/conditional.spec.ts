import { ethers } from "ethers";

import { AbstractContract, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

contract("Conditional", (accounts: string[]) => {
  let example: ethers.Contract;
  let conditionContract: ethers.Contract;

  // @ts-ignore
  before(async () => {
    const staticCall = AbstractContract.fromArtifactName("StaticCall");
    const conditional = await AbstractContract.fromArtifactName("Conditional", {
      StaticCall: staticCall
    });
    const exampleCondition = await AbstractContract.fromArtifactName(
      "ExampleCondition"
    );
    example = await exampleCondition.deploy(unlockedAccount);
    conditionContract = await conditional.deploy(unlockedAccount);
  });

  describe("asserts conditions with no params", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      onlyCheckForSuccess,
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      parameters: ethers.constants.HashZero,
      selector: example.interface.functions.isSatisfiedNoParam.sighash,
      to: example.address
    });

    it("returns true if function did not fail", async () => {
      const condition = makeCondition(ethers.constants.HashZero, true);
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns true if function returns expected result", async () => {
      const condition = makeCondition(
        ethers.utils.defaultAbiCoder.encode(["bool"], [true]),
        false
      );
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns false if function returns unexpected result", async () => {
      const condition = makeCondition(ethers.constants.HashZero, false);
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(false);
    });
  });

  describe("asserts conditions with params", () => {
    const makeCondition = (expectedValue, parameters, onlyCheckForSuccess) => ({
      onlyCheckForSuccess,
      parameters,
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      selector: example.interface.functions.isSatisfiedNoParam.sighash,
      to: example.address
    });

    const trueParam = ethers.utils.defaultAbiCoder.encode(
      ["tuple(bool)"],
      [[true]]
    );

    const falseParam = ethers.utils.defaultAbiCoder.encode(
      ["tuple(bool)"],
      [[false]]
    );

    it("returns true if function did not fail", async () => {
      const condition = makeCondition(
        ethers.constants.HashZero,
        trueParam,
        true
      );
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns true if function did not fail but returned false", async () => {
      const condition = makeCondition(
        ethers.constants.HashZero,
        falseParam,
        true
      );
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns true if function returns expected result", async () => {
      const condition = makeCondition(
        ethers.utils.defaultAbiCoder.encode(["bool"], [true]),
        trueParam,
        false
      );
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns false if function returns unexpected result", async () => {
      const condition = makeCondition(
        ethers.constants.HashZero,
        falseParam,
        false
      );
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(false);
    });
  });
});
