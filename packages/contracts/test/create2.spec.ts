import * as waffle from "ethereum-waffle";
import { Contract, Event, Wallet } from "ethers";
import { Zero } from "ethers/constants";
import { TransactionResponse, Web3Provider } from "ethers/providers";
import {
  defaultAbiCoder,
  getAddress,
  keccak256,
  solidityKeccak256
} from "ethers/utils";

import Echo from "../build/Echo.json";
import Proxy from "../build/Proxy.json";
import ProxyFactory from "../build/ProxyFactory.json";

import { expect } from "./utils/index";

describe("ProxyFactory with CREATE2", function(this: Mocha) {
  this.timeout(5000);

  let provider: Web3Provider;
  let wallet: Wallet;

  let pf: Contract;
  let echo: Contract;

  function create2(initcode: string, salt: number = 0) {
    return getAddress(
      solidityKeccak256(
        ["bytes1", "address", "uint256", "bytes32"],
        ["0xff", pf.address, salt, keccak256(initcode)]
      ).slice(-40)
    );
  }

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];

    pf = await waffle.deployContract(wallet, ProxyFactory);
    echo = await waffle.deployContract(wallet, Echo);
  });

  describe("createProxy", async () => {
    it("can be used to deploy a contract at a predictable address", async () => {
      const masterCopy = echo.address;

      const initcode = defaultAbiCoder.encode(
        ["bytes", "address"],
        [`0x${Proxy.bytecode}`, echo.address]
      );

      const tx: TransactionResponse = await pf.createProxy(masterCopy, Zero);

      const receipt = await tx.wait();

      const event: Event = (receipt as any).events.pop();

      expect(event.event).to.eq("ProxyCreation");
      expect(event.eventSignature).to.eq("ProxyCreation(address)");
      expect(event.args![0]).to.eq(create2(initcode));
    });
  });
});
