import { ethers } from "ethers";

import { expect } from "../utils";
import { assertRejects, randomETHAddress } from "../utils/misc";

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("ConditionalTransaction", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;

  let exampleCondition: ethers.Contract;
  let testDelegateProxy: ethers.Contract;
  let ct: ethers.Contract;

  // @ts-ignore
  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const exampleConditionArtifact = artifacts.require("ExampleCondition");
    const delegateProxyArtifact = artifacts.require("DelegateProxy");
    const conditionalTransactionArtifact = artifacts.require(
      "ConditionalTransaction"
    );

    exampleCondition = new ethers.Contract(
      (await exampleConditionArtifact.new()).address,
      exampleConditionArtifact.abi,
      unlockedAccount
    );

    testDelegateProxy = new ethers.Contract(
      (await delegateProxyArtifact.new()).address,
      delegateProxyArtifact.abi,
      unlockedAccount
    );

    ct = new ethers.Contract(
      (await conditionalTransactionArtifact.new()).address,
      conditionalTransactionArtifact.abi,
      unlockedAccount
    );
  });

  describe("Pre-commit to transfer details", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      onlyCheckForSuccess,
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      parameters: ethers.constants.HashZero,
      selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
      to: exampleCondition.address
    });

    const makeConditionParam = (expectedValue, parameters) => ({
      parameters,
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      onlyCheckForSuccess: false,
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

    beforeEach(async () => {
      await unlockedAccount.sendTransaction({
        to: testDelegateProxy.address,
        value: ethers.constants.WeiPerEther
      });
    });

    it("transfers the funds conditionally if true", async () => {
      const randomTarget = randomETHAddress();
      const tx = ct.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeCondition(ethers.constants.HashZero, true),
          {
            value: [ethers.constants.WeiPerEther],
            assetType: 0,
            to: [randomTarget],
            token: ethers.constants.AddressZero,
            data: []
          }
        ]
      );

      await testDelegateProxy.functions.delegate(ct.address, tx, {
        gasLimit: 600000
      });

      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget.toHexString()).to.be.eql(
        ethers.utils.hexStripZeros(ethers.constants.WeiPerEther.toHexString())
      );

      const emptyBalance = ethers.constants.Zero;
      const balDelegate = await provider.getBalance(testDelegateProxy.address);
      expect(balDelegate.toHexString()).to.be.eql(
        ethers.utils.hexStripZeros(emptyBalance.toHexString())
      );
    });

    it("does not transfer the funds conditionally if false", async () => {
      const randomTarget = randomETHAddress();
      const tx = ct.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeConditionParam(trueParam, falseParam),
          {
            value: [ethers.constants.WeiPerEther],
            assetType: 0,
            to: [randomTarget],
            token: ethers.constants.AddressZero,
            data: []
          }
        ]
      );

      await assertRejects(
        testDelegateProxy.functions.delegate(ct.address, tx, {
          gasLimit: 600000
        })
      );

      const emptyBalance = ethers.constants.Zero;
      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget.toHexString()).to.be.eql(
        ethers.utils.hexStripZeros(emptyBalance.toHexString())
      );

      const balDelegate = await provider.getBalance(testDelegateProxy.address);
      expect(balDelegate.toHexString()).to.be.eql(
        ethers.utils.hexStripZeros(ethers.constants.WeiPerEther.toHexString())
      );
    });
  });
});
