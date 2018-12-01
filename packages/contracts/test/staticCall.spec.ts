import { ethers } from "ethers";

import { expect } from "../utils";
import { assertRejects } from "../utils/misc";

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("StaticCall", (accounts: string[]) => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;
  let testCaller: ethers.Contract;
  let echo: ethers.Contract;

  // @ts-ignore
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
    it("retrieves bytes string from external pure function", async () => {
      const helloWorldString = ethers.utils.hexlify(
        ethers.utils.toUtf8Bytes("hello world")
      );

      const ret = await testCaller.functions.execStaticCall(
        echo.address,
        echo.interface.functions.helloWorld.sighash,
        "0x"
      );

      expect(ret).to.eql(helloWorldString);
    });

    it("retrieves true bool from external pure function", async () => {
      const ret = await testCaller.functions.execStaticCallBool(
        echo.address,
        echo.interface.functions.returnArg.sighash,
        ethers.utils.defaultAbiCoder.encode(["bool"], [true])
      );
      expect(ret).to.eql(true);
    });

    it("retrieves false bool from external pure function", async () => {
      const ret = await testCaller.functions.execStaticCallBool(
        echo.address,
        echo.interface.functions.returnArg.sighash,
        ethers.utils.defaultAbiCoder.encode(["bool"], [false])
      );
      expect(ret).to.eql(false);
    });

    it("retrieves argument from external pure function", async () => {
      const helloWorldString = ethers.utils.defaultAbiCoder.encode(
        ["string"],
        ["hello world"]
      );

      const ret = await testCaller.functions.execStaticCall(
        echo.address,
        echo.interface.functions.helloWorldArg.sighash,
        helloWorldString
      );

      expect(ret).to.eql(
        ethers.utils.hexlify(ethers.utils.toUtf8Bytes("hello world"))
      );
    });

    it("fails to read msg.sender", async () => {
      await assertRejects(
        testCaller.functions.execStaticCall(
          echo.address,
          echo.interface.functions.msgSender.sighash,
          "0x"
        )
      );
    });

    it("reverts if the target is not a contract", async () => {
      await assertRejects(
        testCaller.functions.execStaticCall(
          ethers.utils.hexlify(ethers.utils.randomBytes(20)),
          echo.interface.functions.helloWorld.sighash,
          "0x"
        )
      );
    });
  });
});
