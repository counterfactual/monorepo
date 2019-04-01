import * as waffle from "ethereum-waffle";
import { Contract, Event, Wallet } from "ethers";
import { TransactionResponse, Web3Provider } from "ethers/providers";
import {
  defaultAbiCoder,
  getAddress,
  keccak256,
  solidityKeccak256,
  solidityPack
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

  function create2(
    initcode: string,
    saltNonce: number = 0,
    initializer: string = "0x"
  ) {
    return getAddress(
      solidityKeccak256(
        ["bytes1", "address", "uint256", "bytes32"],
        [
          "0xff",
          pf.address,
          solidityKeccak256(
            ["bytes32", "uint256"],
            [keccak256(initializer), saltNonce]
          ),
          keccak256(initcode)
        ]
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

      const initcode = solidityPack(
        ["bytes", "uint256"],
        [`0x${Proxy.bytecode}`, echo.address]
      );

      const saltNonce = 0;

      const tx: TransactionResponse = await pf.createProxyWithNonce(
        masterCopy,
        "0x",
        saltNonce
      );

      const receipt = await tx.wait();

      const event: Event = (receipt as any).events.pop();

      expect(event.event).to.eq("ProxyCreation");
      expect(event.eventSignature).to.eq("ProxyCreation(address)");
      expect(event.args![0]).to.eq(create2(initcode, saltNonce));

      const echoProxy = new Contract(create2(initcode), Echo.abi, wallet);

      expect(await echoProxy.functions.helloWorld()).to.eq("hello world");
    });
  });
});
