import { Contract, ContractFactory } from "ethers";
import { HashZero } from "ethers/constants";
import { JsonRpcSigner, Web3Provider } from "ethers/providers";
import { defaultAbiCoder, solidityKeccak256 } from "ethers/utils";
import * as solc from "solc";

import { expect } from "./utils";

const provider = new Web3Provider((global as any).web3.currentProvider);

const TEST_CONTRACT_SOLIDITY_CODE = {
  language: "Solidity",
  sources: {
    "test.sol": {
      content: `
      contract Test {
        function sayHello() public pure returns (string memory) {
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

contract("ContractRegistry", accounts => {
  let unlockedAccount: JsonRpcSigner;

  let contractRegistry: Contract;
  let simpleContract: Contract;

  function cfaddress(initcode, i) {
    return solidityKeccak256(
      ["bytes1", "bytes", "uint256"],
      ["0x19", initcode, i]
    );
  }

  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);
  });

  beforeEach(async () => {
    contractRegistry = await new ContractFactory(
      artifacts.require("ContractRegistry").abi,
      artifacts.require("ContractRegistry").bytecode,
      unlockedAccount
    ).deploy({ gasLimit: 6e9 });

    await contractRegistry.deployed();
  });

  it("computes counterfactual addresses of bytes deployments", async () => {
    expect(cfaddress(HashZero, 1)).to.eq(
      await contractRegistry.functions.cfaddress(HashZero, 1)
    );
  });

  it("deploys a contract", done => {
    const output = JSON.parse(
      (solc as any).compile(JSON.stringify(TEST_CONTRACT_SOLIDITY_CODE))
    );
    const iface = output.contracts["test.sol"]["Test"].abi;
    const bytecode = `0x${
      output.contracts["test.sol"]["Test"].evm.bytecode.object
    }`;

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(bytecode, 2))
      );
      simpleContract = new Contract(deployedAddress, iface, unlockedAccount);
      expect(await simpleContract.sayHello()).to.eq("hi");
      done();
    };
    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(bytecode, 2);
  });

  it("deploys a contract using msg.sender", done => {
    const output = JSON.parse(
      (solc as any).compile(JSON.stringify(TEST_CONTRACT_SOLIDITY_CODE))
    );
    const iface = output.contracts["test.sol"]["Test"].abi;
    const bytecode = `0x${
      output.contracts["test.sol"]["Test"].evm.bytecode.object
    }`;

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(bytecode, 3))
      );

      simpleContract = new Contract(deployedAddress, iface, unlockedAccount);
      expect(await simpleContract.sayHello()).to.eq("hi");
      done();
    };
    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(bytecode, 3);
  });

  it("deploys a Proxy contract contract through as owner", done => {
    const output = JSON.parse(
      (solc as any).compile(JSON.stringify(TEST_CONTRACT_SOLIDITY_CODE))
    );
    const iface = output.contracts["test.sol"]["Test"].abi;
    const initcode =
      artifacts.require("Proxy").bytecode +
      defaultAbiCoder.encode(["address"], [simpleContract.address]).substr(2);

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(initcode, 3))
      );

      const contract = new Contract(deployedAddress, iface, unlockedAccount);
      expect(await contract.sayHello()).to.eq("hi");
      done();
    };

    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(initcode, 3);
  });

  it("deploys a contract and passes arguments", done => {
    const output = JSON.parse(
      (solc as any).compile(
        JSON.stringify({
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
        })
      )
    );
    const iface = output.contracts["test.sol"]["Test"].abi;
    const bytecode = `0x${
      output.contracts["test.sol"]["Test"].evm.bytecode.object
    }`;

    const initcode =
      bytecode + defaultAbiCoder.encode(["address"], [accounts[0]]).substr(2);

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(initcode, 4))
      );

      const contract = new Contract(deployedAddress, iface, unlockedAccount);
      expect(await contract.sayHello()).to.eq(accounts[0]);
      done();
    };

    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(initcode, 4);
  });
});
