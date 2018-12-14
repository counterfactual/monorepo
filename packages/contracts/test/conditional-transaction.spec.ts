import { Contract, ContractFactory } from "ethers";
import { AddressZero, HashZero, WeiPerEther, Zero } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import {
  defaultAbiCoder,
  hexlify,
  randomBytes,
  solidityKeccak256
} from "ethers/utils";

import { expect } from "./utils";

const provider = new Web3Provider((global as any).web3.currentProvider);

contract("ConditionalTransaction", (accounts: string[]) => {
  let unlockedAccount: JsonRpcSigner;

  let exampleCondition: Contract;
  let delegateProxy: Contract;
  let conditionalTransaction: Contract;

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    exampleCondition = await new ContractFactory(
      artifacts.require("ExampleCondition").abi,
      artifacts.require("ExampleCondition").bytecode,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    delegateProxy = await new ContractFactory(
      artifacts.require("DelegateProxy").abi,
      artifacts.require("DelegateProxy").bytecode,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    // Contract is already deployed when using Truffle Tests (re-uses migrations)
    const artifact = artifacts.require("ConditionalTransaction");
    artifact.link(artifacts.require("Transfer"));
    artifact.link(artifacts.require("LibStaticCall"));
    conditionalTransaction = await new ContractFactory(
      artifact.abi,
      artifact.binary,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await exampleCondition.deployed();
    await delegateProxy.deployed();
    await conditionalTransaction.deployed();
  });

  describe("Pre-commit to transfer details", () => {
    const makeCondition = (expectedValue, onlyCheckForSuccess) => ({
      onlyCheckForSuccess,
      expectedValueHash: solidityKeccak256(["bytes"], [expectedValue]),
      parameters: HashZero,
      selector: exampleCondition.interface.functions.isSatisfiedNoParam.sighash,
      to: exampleCondition.address
    });

    const makeConditionParam = (expectedValue, parameters) => ({
      parameters,
      expectedValueHash: solidityKeccak256(["bytes"], [expectedValue]),
      onlyCheckForSuccess: false,
      selector: exampleCondition.interface.functions.isSatisfiedParam.sighash,
      to: exampleCondition.address
    });

    const trueParam = defaultAbiCoder.encode(["tuple(bool)"], [[true]]);

    const falseParam = defaultAbiCoder.encode(["tuple(bool)"], [[false]]);

    beforeEach(async () => {
      await unlockedAccount.sendTransaction({
        to: delegateProxy.address,
        value: WeiPerEther
      });
    });

    it("transfers the funds conditionally if true", async () => {
      const randomTarget = hexlify(randomBytes(20));
      const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeCondition(HashZero, true),
          {
            value: [WeiPerEther],
            assetType: 0,
            to: [randomTarget],
            token: AddressZero,
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
      expect(balTarget).to.eq(WeiPerEther);

      const emptyBalance = Zero;
      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate).to.eq(emptyBalance);
    });

    it("does not transfer the funds conditionally if false", async () => {
      const randomTarget = hexlify(randomBytes(20));
      const tx = conditionalTransaction.interface.functions.executeSimpleConditionalTransaction.encode(
        [
          makeConditionParam(trueParam, falseParam),
          {
            value: [WeiPerEther],
            assetType: 0,
            to: [randomTarget],
            token: AddressZero,
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

      const emptyBalance = Zero;
      const balTarget = await provider.getBalance(randomTarget);
      expect(balTarget).to.eq(emptyBalance);

      const balDelegate = await provider.getBalance(delegateProxy.address);
      expect(balDelegate).to.eq(WeiPerEther);
    });
  });
});
