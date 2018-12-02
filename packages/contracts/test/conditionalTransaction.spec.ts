import { ethers } from "ethers";

import { expect } from "../utils";

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("ConditionalTransaction", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;

  let exampleCondition: ethers.Contract;
  let delegateProxy: ethers.Contract;
  let conditionalTransaction: ethers.Contract;

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    exampleCondition = await new ethers.ContractFactory(
      artifacts.require("ExampleCondition").abi,
      artifacts.require("ExampleCondition").bytecode,
      unlockedAccount
    ).deploy();

    delegateProxy = await new ethers.ContractFactory(
      artifacts.require("DelegateProxy").abi,
      artifacts.require("DelegateProxy").bytecode,
      unlockedAccount
    ).deploy();

    // Contract is already deployed when using Truffle Tests (re-uses migrations)
    conditionalTransaction = new ethers.Contract(
      artifacts.require("ConditionalTransaction").address,
      artifacts.require("ConditionalTransaction").abi,
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
        to: delegateProxy.address,
        value: ethers.constants.WeiPerEther
      });
    });

    it("transfers the funds conditionally if true", async () => {
      const randomTarget = ethers.utils.hexlify(ethers.utils.randomBytes(20));
      const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode(
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

      await delegateProxy.functions.delegate(
        conditionalTransaction.address,
        tx,
        {
          gasLimit: 600000
        }
      );

      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget).to.eq(ethers.constants.WeiPerEther);

      const emptyBalance = ethers.constants.Zero;
      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate).to.eq(emptyBalance);
    });

    it("does not transfer the funds conditionally if false", async () => {
      const randomTarget = ethers.utils.hexlify(ethers.utils.randomBytes(20));
      const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode(
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

      await expect(
        delegateProxy.functions.delegate(conditionalTransaction.address, tx, {
          gasLimit: 60000
        })
        // @ts-ignore
      ).to.be.reverted;

      const emptyBalance = ethers.constants.Zero;
      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget).to.eq(emptyBalance);

      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate).to.eq(ethers.constants.WeiPerEther);
    });
  });
});
