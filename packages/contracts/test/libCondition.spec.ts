import { ethers } from "ethers";

import { expect } from "../utils";

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("LibCondition", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;

  let exampleCondition: ethers.Contract;
  let libCondition: ethers.Contract;

  // @ts-ignore
  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const libConditionArtifact = artifacts.require("LibCondition");
    const exampleConditionArtifact = artifacts.require("ExampleCondition");

    libConditionArtifact.link(artifacts.require("LibStaticCall"));

    exampleCondition = new ethers.Contract(
      (await exampleConditionArtifact.new()).address,
      exampleConditionArtifact.abi,
      unlockedAccount
    );

    libCondition = new ethers.Contract(
      (await libConditionArtifact.new()).address,
      libConditionArtifact.abi,
      unlockedAccount
    );
  });

  describe("asserts conditions with no params", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      onlyCheckForSuccess,
      expectedValueHash: ethers.utils.keccak256(expectedValue),
      parameters: ethers.constants.HashZero,
      selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
      to: exampleCondition.address
    });

    it("returns true if function did not fail", async () => {
      const condition = makeCondition(ethers.constants.HashZero, true);
      const ret = await libCondition.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns true if function returns expected result", async () => {
      const condition = makeCondition(
        ethers.utils.defaultAbiCoder.encode(["bool"], [true]),
        false
      );
      const ret = await libCondition.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns false if function returns unexpected result", async () => {
      const condition = makeCondition(ethers.constants.HashZero, false);
      const ret = await libCondition.functions.isSatisfied(condition);
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
      selector: exampleCondition.interface.functions.isSatisfiedParam.sighash,
      to: exampleCondition.address
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
      const ret = await libCondition.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns true if function did not fail but returned false", async () => {
      const condition = makeCondition(
        ethers.constants.HashZero,
        falseParam,
        true
      );
      const ret = await libCondition.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns true if function returns expected result", async () => {
      const condition = makeCondition(
        ethers.utils.defaultAbiCoder.encode(["bool"], [true]),
        trueParam,
        false
      );
      const ret = await libCondition.functions.isSatisfied(condition);
      expect(ret).to.be.eql(true);
    });

    it("returns false if function returns unexpected result", async () => {
      const condition = makeCondition(
        ethers.utils.defaultAbiCoder.encode(["bool"], [true]),
        falseParam,
        false
      );
      const ret = await libCondition.functions.isSatisfied(condition);
      expect(ret).to.be.eql(false);
    });
  });
});
