import * as ethers from "ethers";
import { ContractFunction } from "ethers/contracts/contract";

import * as Utils from "../helpers/utils";

const Disputable = artifacts.require("Disputable");
const ExampleDisputableState = artifacts.require("ExampleDisputableState");

const web3 = (global as any).web3;
const { provider, unlockedAccount } = Utils.setupTestEnv(web3);

ExampleDisputableState.link("Disputable", Disputable.address);

contract("Disputable", (accounts: string[]) => {
  let example: ethers.Contract;

  enum Status {
    OK,
    DISPUTE,
    SETTLED
  }

  before(async () => {
    example = await Utils.deployContract(
      ExampleDisputableState,
      unlockedAccount
    );
  });

  describe("Creating disputable state from seed", () => {
    it("works", async () => {
      const timeout = 1000;
      const ret = await example.functions.createFromStateHash(
        Utils.zeroBytes32,
        timeout
      );
      ret.meta.status.should.be.equal(Status.OK);
      ret.meta.nonce.should.be.bignumber.equal(0);
      ret.meta.finalizesAt.should.be.bignumber.equal(0);
      ret.meta.disputeCounter.should.be.bignumber.equal(0);
      ret.meta.timeoutPeriod.should.be.bignumber.equal(timeout);
      ret.proof.should.be.equal(Utils.zeroBytes32);
    });
  });

  describe("Setting disputable state", () => {
    const timeout = 10;

    const checkNonce1Higher = async (
      getter: ContractFunction,
      setter: ContractFunction,
      data: any,
      hashedData: string
    ) => {
      const before = await getter();
      before.meta.nonce.should.be.bignumber.equal(0);

      await setter(data, 1, Utils.highGasLimit);

      const after = await getter();
      after.meta.status.should.be.equal(Status.DISPUTE);
      after.meta.nonce.should.be.bignumber.equal(1);
      after.meta.finalizesAt.should.be.bignumber.equal(
        (await provider.getBlockNumber()) + timeout
      );
      after.meta.disputeCounter.should.be.bignumber.equal(1);
      after.meta.timeoutPeriod.should.be.bignumber.equal(timeout);
      after.proof.should.be.equal(hashedData);
    };

    const checkNonceMuchHigher = async (
      getter: ContractFunction,
      setter: ContractFunction,
      data: any,
      hashedData: string
    ) => {
      const before = await getter();
      before.meta.nonce.should.be.bignumber.equal(1);

      await setter(data, 3, Utils.highGasLimit);

      const after = await getter();
      after.meta.status.should.be.equal(Status.DISPUTE);
      after.meta.nonce.should.be.bignumber.equal(3);
      after.meta.finalizesAt.should.be.bignumber.equal(
        (await provider.getBlockNumber()) + timeout
      );
      after.meta.disputeCounter.should.be.bignumber.equal(2);
      after.meta.timeoutPeriod.should.be.bignumber.equal(timeout);
      after.proof.should.be.equal(hashedData);
    };

    const checkInvalidNonce = async (
      getter: ContractFunction,
      setter: ContractFunction,
      data: any
    ) => {
      const before = await getter();
      before.meta.nonce.should.be.bignumber.equal(3);

      await Utils.assertRejects(setter(data, 0, Utils.highGasLimit));
      await Utils.assertRejects(setter(data, 1, Utils.highGasLimit));

      const after = await getter();
      after.meta.nonce.should.be.bignumber.equal(3);
    };

    describe("for uint8", () => {
      before(async () => {
        await example.functions.newUint8(0, timeout);
      });

      it("sets correctly for nonce 1 higher", async () => {
        await checkNonce1Higher(
          example.functions.stateUint8,
          example.functions.setUint8,
          0,
          ethers.utils.solidityKeccak256(["uint8"], [0])
        );
      });

      it("sets correctly for nonce >1 higher", async () => {
        await checkNonceMuchHigher(
          example.functions.stateUint8,
          example.functions.setUint8,
          0,
          ethers.utils.solidityKeccak256(["uint8"], [0])
        );
      });

      it("disallows for nonce equal or lower", async () => {
        await checkInvalidNonce(
          example.functions.stateUint8,
          example.functions.setUint8,
          0
        );
      });
    });

    describe("for bytes", () => {
      before(async () => {
        await example.functions.newBytes(Utils.zeroBytes32, timeout);
      });

      it("sets correctly for nonce 1 higher", async () => {
        await checkNonce1Higher(
          example.functions.stateBytes,
          example.functions.setBytes,
          Utils.zeroBytes32,
          ethers.utils.solidityKeccak256(["bytes"], [Utils.zeroBytes32])
        );
      });

      it("sets correctly for nonce >1 higher", async () => {
        await checkNonceMuchHigher(
          example.functions.stateBytes,
          example.functions.setBytes,
          Utils.zeroBytes32,
          ethers.utils.solidityKeccak256(["bytes"], [Utils.zeroBytes32])
        );
      });

      it("disallows for nonce equal or lower", async () => {
        await checkInvalidNonce(
          example.functions.stateBytes,
          example.functions.setBytes,
          Utils.zeroBytes32
        );
      });
    });

    describe("for struct", () => {
      const struct = { a: [] };

      before(async () => {
        await example.functions.newStruct(struct, timeout);
      });

      it("sets correctly for nonce 1 higher", async () => {
        await checkNonce1Higher(
          example.functions.stateStruct,
          example.functions.setStruct,
          struct,
          ethers.utils.solidityKeccak256(
            ["bytes"],
            [
              ethers.utils.defaultAbiCoder.encode(
                ["tuple(uint8[] a)"],
                [struct]
              )
            ]
          )
        );
      });

      it("sets correctly for nonce >1 higher", async () => {
        await checkNonceMuchHigher(
          example.functions.stateStruct,
          example.functions.setStruct,
          struct,
          ethers.utils.solidityKeccak256(
            ["bytes"],
            [
              ethers.utils.defaultAbiCoder.encode(
                ["tuple(uint8[] a)"],
                [struct]
              )
            ]
          )
        );
      });

      it("disallows for nonce equal or lower", async () => {
        await checkInvalidNonce(
          example.functions.stateStruct,
          example.functions.setStruct,
          struct
        );
      });
    });
  });

  describe("Finalizing disputable state", () => {
    const timeout = 10;

    const checkStateWasFinalized = async (
      getter: ContractFunction,
      setter: ContractFunction,
      hashedData: string
    ) => {
      const before = await getter();
      before.meta.nonce.should.be.bignumber.equal(0);

      await setter(Utils.highGasLimit);

      const after = await getter();
      after.meta.status.should.be.equal(Status.SETTLED);
      after.meta.nonce.should.be.bignumber.equal(0);
      after.meta.finalizesAt.should.be.bignumber.equal(
        await provider.getBlockNumber()
      );
      after.meta.disputeCounter.should.be.bignumber.equal(0);
      after.meta.timeoutPeriod.should.be.bignumber.equal(timeout);
      after.proof.should.be.equal(hashedData);
    };

    it("works for uint8", async () => {
      await example.functions.newUint8(0, timeout, Utils.highGasLimit);
      await checkStateWasFinalized(
        example.functions.stateUint8,
        example.functions.finalizeUint8,
        ethers.utils.solidityKeccak256(["uint8"], [0])
      );
    });

    it("works for bytes", async () => {
      await example.functions.newBytes(
        Utils.zeroBytes32,
        timeout,
        Utils.highGasLimit
      );
      await checkStateWasFinalized(
        example.functions.stateBytes,
        example.functions.finalizeBytes,
        ethers.utils.solidityKeccak256(["bytes"], [Utils.zeroBytes32])
      );
    });

    it("works for struct", async () => {
      const struct = { a: [] };
      await example.functions.newStruct(struct, timeout, Utils.highGasLimit);
      await checkStateWasFinalized(
        example.functions.stateStruct,
        example.functions.finalizeStruct,
        ethers.utils.solidityKeccak256(
          ["bytes"],
          [ethers.utils.defaultAbiCoder.encode(["tuple(uint8[] a)"], [struct])]
        )
      );
    });
  });

  describe("Resolving disputable state", () => {
    const timeout = 10;

    const checkStateWasResolved = async (
      getter: ContractFunction,
      setter: ContractFunction,
      hashedData: string
    ) => {
      const before = await getter();
      before.meta.nonce.should.be.bignumber.equal(0);

      await setter(Utils.highGasLimit);

      const after = await getter();
      after.meta.status.should.be.equal(Status.OK);
      after.meta.nonce.should.be.bignumber.equal(0);
      after.meta.finalizesAt.should.be.bignumber.equal(0);
      after.meta.disputeCounter.should.be.bignumber.equal(0);
      after.meta.timeoutPeriod.should.be.bignumber.equal(timeout);
      after.proof.should.be.equal(hashedData);
    };

    it("works for uint8", async () => {
      await example.functions.newUint8(0, timeout, Utils.highGasLimit);
      await checkStateWasResolved(
        example.functions.stateUint8,
        example.functions.resolveUint8,
        ethers.utils.solidityKeccak256(["uint8"], [0])
      );
    });

    it("works for bytes", async () => {
      await example.functions.newBytes(
        Utils.zeroBytes32,
        timeout,
        Utils.highGasLimit
      );
      await checkStateWasResolved(
        example.functions.stateBytes,
        example.functions.resolveBytes,
        ethers.utils.solidityKeccak256(["bytes"], [Utils.zeroBytes32])
      );
    });

    it("works for struct", async () => {
      const struct = { a: [] };
      await example.functions.newStruct(struct, timeout, Utils.highGasLimit);
      await checkStateWasResolved(
        example.functions.stateStruct,
        example.functions.resolveStruct,
        ethers.utils.solidityKeccak256(
          ["bytes"],
          [ethers.utils.defaultAbiCoder.encode(["tuple(uint8[] a)"], [struct])]
        )
      );
    });
  });
});
