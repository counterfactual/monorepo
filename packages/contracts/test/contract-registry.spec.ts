import * as waffle from "ethereum-waffle";
import { Contract, Wallet } from "ethers";
import { HashZero } from "ethers/constants";
import { Web3Provider } from "ethers/providers";
import { defaultAbiCoder, solidityKeccak256 } from "ethers/utils";
import * as solc from "solc";

import ContractRegistry from "../build/ContractRegistry.json";

import { expect } from "./utils";

const TEST_CONTRACT_SOLIDITY_CODE = {
  language: "Solidity",
  sources: {
    "test.sol": {
      content: `
      contract Test {
        address whatToSay;
        constructor(address _whatToSay) public {
            whatToSay = _whatToSay;
        }
        function sayHello() public view returns (address) {
            return whatToSay;
        }
        function sayHelloSimple() public pure returns (string memory) {
          return "hi";
        }
      }`
    }
  },
  settings: {
    outputSelection: {
      "*": {
        "*": ["*"]
      }
    }
  }
};

describe("ContractRegistry", function(this: Mocha) {
  this.timeout(6000);

  let provider: Web3Provider;
  let wallet: Wallet;

  let contractRegistry: Contract;

  let output: any;
  let iface: any;
  let bytecode: string;

  function cfaddress(initcode: string, i: number) {
    return solidityKeccak256(
      ["bytes1", "bytes", "uint256"],
      ["0x19", initcode, i]
    );
  }

  const TEST_ADDRESS = Wallet.createRandom().address;

  before(async () => {
    provider = waffle.createMockProvider();
    wallet = (await waffle.getWallets(provider))[0];
    output = JSON.parse(
      solc.compile(JSON.stringify(TEST_CONTRACT_SOLIDITY_CODE))
    );
    iface = output.contracts["test.sol"]["Test"].abi;
    bytecode = `0x${
      output.contracts["test.sol"]["Test"].evm.bytecode.object
    }${defaultAbiCoder.encode(["address"], [TEST_ADDRESS]).substr(2)}`;
  });

  beforeEach(async () => {
    contractRegistry = await waffle.deployContract(wallet, ContractRegistry);
  });

  it("computes counterfactual addresses of bytes deployments", async () => {
    expect(cfaddress(HashZero, 1)).to.eq(
      await contractRegistry.functions.cfaddress(HashZero, 1)
    );
  });

  it("deploys a contract", async () => {
    await contractRegistry.functions.deploy(bytecode, 2);

    const test = new Contract(
      await contractRegistry.functions.resolver(cfaddress(bytecode, 2)),
      iface,
      wallet
    );

    expect(await test.sayHelloSimple()).to.eq("hi");
    expect(await test.sayHello()).to.eq(TEST_ADDRESS);
  });
});
