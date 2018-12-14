import { Contract, ContractFactory } from "ethers";
import { HashZero } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { defaultAbiCoder, keccak256, solidityKeccak256 } from "ethers/utils";

import { expect } from "./utils";

const provider = new Web3Provider((global as any).web3.currentProvider);

contract("LibCondition", (accounts: string[]) => {
  let unlockedAccount: JsonRpcSigner;

  let exampleCondition: Contract;
  let libCondition: Contract;

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const libConditionArtifact = artifacts.require("LibCondition");
    const exampleConditionArtifact = artifacts.require("ExampleCondition");

    libConditionArtifact.link(artifacts.require("LibStaticCall"));

    exampleCondition = await new ContractFactory(
      exampleConditionArtifact.abi,
      exampleConditionArtifact.bytecode,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    libCondition = await new ContractFactory(
      libConditionArtifact.abi,
      libConditionArtifact.binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await exampleCondition.deployed();
    await libCondition.deployed();
  });

  describe("asserts conditions with no params", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      onlyCheckForSuccess,
      expectedValueHash: keccak256(expectedValue),
      parameters: HashZero,
      selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
      to: exampleCondition.address
    });

    it("returns true if function did not fail", async () => {
      const condition = makeCondition(HashZero, true);

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns true if function returns expected result", async () => {
      const condition = makeCondition(
        defaultAbiCoder.encode(["bool"], [true]),
        false
      );

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns false if function returns unexpected result", async () => {
      const condition = makeCondition(HashZero, false);

      expect(await libCondition.functions.isSatisfied(condition)).to.be.false;
    });
  });

  describe("asserts conditions with params", () => {
    const makeCondition = (expectedValue, parameters, onlyCheckForSuccess) => ({
      onlyCheckForSuccess,
      parameters,
      expectedValueHash: solidityKeccak256(["bytes"], [expectedValue]),
      selector: exampleCondition.interface.functions.isSatisfiedParam.sighash,
      to: exampleCondition.address
    });

    const trueParam = defaultAbiCoder.encode(["tuple(bool)"], [[true]]);

    const falseParam = defaultAbiCoder.encode(["tuple(bool)"], [[false]]);

    it("returns true if function did not fail", async () => {
      const condition = makeCondition(HashZero, trueParam, true);

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns true if function did not fail but returned false", async () => {
      const condition = makeCondition(HashZero, falseParam, true);

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns true if function returns expected result", async () => {
      const condition = makeCondition(
        defaultAbiCoder.encode(["bool"], [true]),
        trueParam,
        false
      );

      expect(await libCondition.functions.isSatisfied(condition)).to.be.true;
    });

    it("returns false if function returns unexpected result", async () => {
      const condition = makeCondition(
        defaultAbiCoder.encode(["bool"], [true]),
        falseParam,
        false
      );

      expect(await libCondition.functions.isSatisfied(condition)).to.be.false;
    });
  });
});
