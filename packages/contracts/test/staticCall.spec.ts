import { ethers } from "ethers";

import { expect } from "../utils";

const { defaultAbiCoder, hexlify, randomBytes, toUtf8Bytes } = ethers.utils;

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("StaticCall", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;
  let testCaller: ethers.Contract;
  let echo: ethers.Contract;

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);

    const testCallerArtifact = artifacts.require("TestCaller");
    const echoArtifact = artifacts.require("Echo");

    testCallerArtifact.link(artifacts.require("LibStaticCall"));

    testCaller = new ethers.Contract(
      (await testCallerArtifact.new()).address,
      testCallerArtifact.abi,
      unlockedAccount
    );

    echo = new ethers.Contract(
      (await echoArtifact.new()).address,
      echoArtifact.abi,
      unlockedAccount
    );
  });

  describe("execStaticCall", () => {
    const helloWorldString = hexlify(toUtf8Bytes("hello world"));

    it("retrieves bytes string from external pure function", async () => {
      const ret = await testCaller.functions.execStaticCall(
        echo.address,
        echo.interface.functions.helloWorld.sighash,
        "0x"
      );

      expect(ret).to.eq(helloWorldString);
    });

    it("retrieves true bool from external pure function", async () => {
      const ret = await testCaller.functions.execStaticCallBool(
        echo.address,
        echo.interface.functions.returnArg.sighash,
        defaultAbiCoder.encode(["bool"], [true])
      );
      expect(ret).to.be.true;
    });

    it("retrieves false bool from external pure function", async () => {
      const ret = await testCaller.functions.execStaticCallBool(
        echo.address,
        echo.interface.functions.returnArg.sighash,
        defaultAbiCoder.encode(["bool"], [false])
      );
      expect(ret).to.be.false;
    });

    it("retrieves argument from external pure function", async () => {
      const ret = await testCaller.functions.execStaticCall(
        echo.address,
        echo.interface.functions.helloWorldArg.sighash,
        defaultAbiCoder.encode(["string"], ["hello world"])
      );

      expect(ret).to.eq(helloWorldString);
    });

    it("fails to read msg.sender", async () => {
      await expect(
        testCaller.functions.execStaticCall(
          echo.address,
          echo.interface.functions.msgSender.sighash,
          "0x"
        )
        // @ts-ignore
      ).to.be.reverted;
    });

    it("reverts if the target is not a contract", async () => {
      await expect(
        testCaller.functions.execStaticCall(
          hexlify(randomBytes(20)),
          echo.interface.functions.helloWorld.sighash,
          "0x"
        )
        // @ts-ignore
      ).to.be.reverted;
    });
  });
});
