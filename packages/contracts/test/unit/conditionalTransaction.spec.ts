import * as Utils from "@counterfactual/test-utils";
import * as ethers from "ethers";
import { AbstractContract, expect } from "../../utils";

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

contract("ConditionalTransaction", (accounts: string[]) => {
  let condition: ethers.Contract;
  let delegateProxy: ethers.Contract;
  let ct: ethers.Contract;

  // @ts-ignore
  before(async () => {
    const ExampleCondition = await AbstractContract.loadBuildArtifact(
      "ExampleCondition"
    );
    const DelegateProxy = await AbstractContract.loadBuildArtifact(
      "DelegateProxy"
    );
    const ConditionalTransaction = await AbstractContract.loadBuildArtifact(
      "ConditionalTransaction"
    );

    condition = await ExampleCondition.deploy(unlockedAccount);
    delegateProxy = await DelegateProxy.deploy(unlockedAccount);
    ct = await ConditionalTransaction.getDeployed(unlockedAccount);
  });

  describe("Pre-commit to transfer details", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      expectedValueHash: ethers.utils.solidityKeccak256(
        ["bytes"],
        [expectedValue]
      ),
      onlyCheckForSuccess,
      parameters: Utils.ZERO_BYTES32,
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
      const tx = ct.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeCondition(Utils.ZERO_BYTES32, true),
          {
            value: [Utils.UNIT_ETH],
            assetType: 0,
            to: [randomTarget],
            token: Utils.ZERO_ADDRESS,
            data: []
          }
        ]
      );

      await delegateProxy.functions.delegate(
        ct.address,
        tx,
        Utils.HIGH_GAS_LIMIT
      );

      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget.toHexString()).to.be.eql(
        ethers.utils.hexStripZeros(Utils.UNIT_ETH.toHexString())
      );

      const emptyBalance = new ethers.utils.BigNumber(0);
      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate.toHexString()).to.be.eql(
        ethers.utils.hexStripZeros(emptyBalance.toHexString())
      );
    });

    it("does not transfer the funds conditionally if false", async () => {
      const randomTarget = Utils.randomETHAddress();
      const tx = ct.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeConditionParam(trueParam, falseParam),
          {
            value: [Utils.UNIT_ETH],
            assetType: 0,
            to: [randomTarget],
            token: Utils.ZERO_ADDRESS,
            data: []
          }
        ]
      );

      await Utils.assertRejects(
        delegateProxy.functions.delegate(ct.address, tx)
      );

      const emptyBalance = new ethers.utils.BigNumber(0);
      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget.toHexString()).to.be.eql(
        ethers.utils.hexStripZeros(emptyBalance.toHexString())
      );

      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate.toHexString()).to.be.eql(
        ethers.utils.hexStripZeros(Utils.UNIT_ETH.toHexString())
      );
    });
  });
});
