import * as Utils from "@counterfactual/dev-utils";
import * as ethers from "ethers";
import { AbstractContract, expect } from "../../utils";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

contract("StaticCall", (accounts: string[]) => {
  let testCaller: ethers.Contract;
  let echo: ethers.Contract;

  // @ts-ignore
  before(async () => {
    const staticCall = AbstractContract.loadBuildArtifact("StaticCall");
    const testCallerArtifact = await AbstractContract.loadBuildArtifact(
      "TestCaller",
      {
        StaticCall: staticCall
      }
    );
    const echoArtifact = await AbstractContract.loadBuildArtifact("Echo");
    testCaller = await testCallerArtifact.deploy(unlockedAccount);
    echo = await echoArtifact.deploy(unlockedAccount);
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
      await Utils.assertRejects(
        testCaller.functions.execStaticCall(
          echo.address,
          echo.interface.functions.msgSender.sighash,
          "0x"
        )
      );
    });

    it("reverts if the target is not a contract", async () => {
      await Utils.assertRejects(
        testCaller.functions.execStaticCall(
          ethers.utils.hexlify(ethers.utils.randomBytes(20)),
          echo.interface.functions.helloWorld.sighash,
          "0x"
        )
      );
    });
  });
});
