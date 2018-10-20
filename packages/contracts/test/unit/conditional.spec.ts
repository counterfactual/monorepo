import * as Utils from "@counterfactual/dev-utils";
import * as ethers from "ethers";
import { AbstractContract, expect } from "../../utils";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

contract("Conditional", (accounts: string[]) => {
  let example: ethers.Contract;
  let conditionContract: ethers.Contract;

  // @ts-ignore
  before(async () => {
    const StaticCall = AbstractContract.loadBuildArtifact("StaticCall");
    const Conditional = await AbstractContract.loadBuildArtifact(
      "Conditional",
      {
        StaticCall
      }
    );
    const ExampleCondition = await AbstractContract.loadBuildArtifact(
      "ExampleCondition"
    );
    example = await ExampleCondition.deploy(unlockedAccount);
    conditionContract = await Conditional.deploy(unlockedAccount);
  });

  describe("asserts conditions with no params", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      onlyCheckForSuccess,
      parameters: Utils.ZERO_BYTES32,
      selector: example.interface.functions.isSatisfiedNoParam.sighash,
      to: example.address
    });

    it("returns true if function did not fail", async () => {
      const condition = makeCondition(Utils.ZERO_BYTES32, true);
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
      const condition = makeCondition(Utils.ZERO_BYTES32, false);
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(false);
    });
  });

  describe("asserts conditions with params", () => {
    const makeCondition = (expectedValue, parameters, onlyCheckForSuccess) => ({
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      onlyCheckForSuccess,
      parameters,
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
      const condition = makeCondition(Utils.ZERO_BYTES32, trueParam, true);
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns true if function did not fail but returned false", async () => {
      const condition = makeCondition(Utils.ZERO_BYTES32, falseParam, true);
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
      const condition = makeCondition(Utils.ZERO_BYTES32, falseParam, false);
      const ret = await conditionContract.functions.isSatisfied(condition);
      expect(ret).to.be.eql(false);
    });
  });
});
