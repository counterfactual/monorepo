import * as waffle from "ethereum-waffle";
import { ethers } from "ethers";

import Echo from "../build/Echo.json";
import LibStaticCall from "../build/LibStaticCall.json";
import TestCaller from "../build/TestCaller.json";

import { expect } from "./utils";

const { defaultAbiCoder, hexlify, randomBytes, toUtf8Bytes } = ethers.utils;

describe("StaticCall", () => {
  let provider: ethers.providers.Web3Provider;
  let wallet: ethers.Wallet;

  let testCaller: ethers.Contract;
  let echo: ethers.Contract;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    const libStaticCall = await waffle.deployContract(wallet, LibStaticCall);
    waffle.link(
      TestCaller,
      "contracts/libs/LibStaticCall.sol:LibStaticCall",
      libStaticCall.address
    );

    testCaller = await waffle.deployContract(wallet, TestCaller);
    echo = await waffle.deployContract(wallet, Echo);
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
