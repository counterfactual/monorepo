import * as ethers from "ethers";

import * as Utils from "@counterfactual/test-utils";

const ExampleCondition = artifacts.require("ExampleCondition");
const DelegateProxy = artifacts.require("DelegateProxy");
const ConditionalTransfer = artifacts.require("ConditionalTransfer");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

contract("ConditionalTransfer", (accounts: string[]) => {
  let condition: ethers.Contract;
  let delegateProxy: ethers.Contract;
  let ct: ethers.Contract;

  before(async () => {
    condition = await Utils.deployContract(ExampleCondition, unlockedAccount);
    delegateProxy = await Utils.deployContract(DelegateProxy, unlockedAccount);
    ct = await Utils.getDeployedContract(ConditionalTransfer, unlockedAccount);
  });

  it("instantiates with correct registry address", async () => {
    const registry = await ct.functions.registry();
    registry.should.be.equalIgnoreCase(artifacts.require("Registry").address);
  });

  describe("Pre-commit to transfer details", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      onlyCheckForSuccess,
      parameters: Utils.zeroBytes32,
      selector: condition.interface.functions.isSatisfiedNoParam.sighash,
      to: condition.address
    });

    const makeConditionParam = (expectedValue, parameters) => ({
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      onlyCheckForSuccess: false,
      parameters,
      selector: condition.interface.functions.isSatisfiedParam.sighash,
      to: condition.address
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
        to: delegateProxy.address,
        value: Utils.UNIT_ETH
      });
    });

    it("transfers the funds conditionally if true", async () => {
      const randomTarget = Utils.randomETHAddress();
      const tx = ct.interface.functions.executeSimpleConditionalTransfer.encode(
        [
          makeCondition(Utils.zeroBytes32, true),
          {
            amount: [Utils.UNIT_ETH],
            assetType: 0,
            to: [randomTarget],
            token: Utils.zeroAddress,
            data: Utils.zeroAddress
          }
        ]
      );

      await delegateProxy.functions.delegate(
        ct.address,
        tx,
        Utils.highGasLimit
      );

      const balTarget = await provider.getBalance(randomTarget);
      balTarget.should.be.bignumber.equal(Utils.UNIT_ETH);

      const balDelegate = await provider.getBalance(delegateProxy.address);
      balDelegate.should.be.bignumber.equal(0);
    });

    it("does not transfer the funds conditionally if false", async () => {
      const randomTarget = Utils.randomETHAddress();
      const tx = ct.interface.functions.executeSimpleConditionalTransfer.encode(
        [
          makeConditionParam(trueParam, falseParam),
          {
            amount: [Utils.UNIT_ETH],
            assetType: 0,
            to: [randomTarget],
            token: Utils.zeroAddress,
            data: Utils.zeroAddress
          }
        ]
      );

      await Utils.assertRejects(
        delegateProxy.functions.delegate(ct.address, tx, Utils.highGasLimit)
      );

      const balTarget = await provider.getBalance(randomTarget);
      balTarget.should.be.bignumber.equal(0);

      const balDelegate = await provider.getBalance(delegateProxy.address);
      balDelegate.should.be.bignumber.equal(Utils.UNIT_ETH);
    });
  });
});
