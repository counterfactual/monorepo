import { ethers } from "ethers";
import * as solc from "solc";

import { expect } from "../utils";

const provider = new ethers.providers.Web3Provider(
  (global as any).web3.currentProvider
);

contract("ContractRegistry", accounts => {
  let unlockedAccount: ethers.providers.JsonRpcSigner;

  let contractRegistry: ethers.Contract;
  let simpleContract: ethers.Contract;

  function cfaddress(initcode, i) {
    return ethers.utils.solidityKeccak256(
      ["bytes1", "bytes", "uint256"],
      ["0x19", initcode, i]
    );
  }
  const simpleContractSource = `
    contract Test {
      function sayHello() public pure returns (string) {
        return "hi";
      }
    }`;

  // @ts-ignore
  before(async () => {
    unlockedAccount = await provider.getSigner(accounts[0]);
  });

  // @ts-ignore
  beforeEach(async () => {
    contractRegistry = await new ethers.ContractFactory(
      artifacts.require("ContractRegistry").abi,
      artifacts.require("ContractRegistry").bytecode,
      unlockedAccount
    ).deploy();
  });

  it("computes counterfactual addresses of bytes deployments", async () => {
    expect(cfaddress(ethers.constants.HashZero, 1)).to.eq(
      await contractRegistry.functions.cfaddress(ethers.constants.HashZero, 1)
    );
  });

  it("deploys a contract", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = `0x${output.contracts[":Test"].bytecode}`;

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(bytecode, 2))
      );
      simpleContract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await simpleContract.sayHello()).to.eq("hi");
      done();
    };
    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(bytecode, 2);
  });

  it("deploys a contract using msg.sender", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = `0x${output.contracts[":Test"].bytecode}`;

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(bytecode, 3))
      );

      simpleContract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await simpleContract.sayHello()).to.eq("hi");
      done();
    };
    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(bytecode, 3);
  });

  it("deploys a ProxyContract contract through as owner", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const initcode =
      artifacts.require("Proxy").bytecode +
      ethers.utils.defaultAbiCoder
        .encode(["address"], [simpleContract.address])
        .substr(2);

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(initcode, 3))
      );

      const contract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await contract.sayHello()).to.eq("hi");
      done();
    };

    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(initcode, 3);
  });

  it("deploys a contract and passes arguments", done => {
    const source = `
        contract Test {
            address whatToSay;
            function Test(address _whatToSay) public {
                whatToSay = _whatToSay;
            }
            function sayHello() public view returns (address) {
                return whatToSay;
            }
        }`;
    const output = (solc as any).compile(source, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = `0x${output.contracts[":Test"].bytecode}`;

    const initcode =
      bytecode +
      ethers.utils.defaultAbiCoder.encode(["address"], [accounts[0]]).substr(2);

    const filter = contractRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eq(
        await contractRegistry.resolver(cfaddress(initcode, 4))
      );

      const contract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await contract.sayHello()).to.equalIgnoreCase(accounts[0]);
      done();
    };

    const registryContract = contractRegistry.on(filter, callback);
    registryContract.deploy(initcode, 4);
  });
});
