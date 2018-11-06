import * as ethers from "ethers";
import * as solc from "solc";

import { Registry } from "../../types/ethers-contracts/Registry";

import { AbstractContract, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

contract("Registry", accounts => {
  let testRegistry: Registry;
  let simpleContract: ethers.Contract;
  let proxyContract: AbstractContract;

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
  beforeEach(async () => {
    proxyContract = await AbstractContract.fromArtifactName("Proxy");
    const registry = await AbstractContract.fromArtifactName("Registry");

    testRegistry = (await registry.deploy(unlockedAccount)) as Registry;
  });

  it("computes counterfactual addresses of bytes deployments", async () => {
    expect(cfaddress(ethers.constants.HashZero, 1)).to.eql(
      await testRegistry.cfaddress(ethers.constants.HashZero, 1)
    );
  });

  it("deploys a contract", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = `0x${output.contracts[":Test"].bytecode}`;

    const filter = testRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eql(
        await testRegistry.functions.resolver(cfaddress(bytecode, 2))
      );
      simpleContract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await simpleContract.sayHello()).to.eql("hi");
      done();
    };
    const registryContract = testRegistry.on(filter, callback);
    registryContract.functions.deploy(bytecode, 2);
  });

  it("deploys a contract using msg.sender", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = `0x${output.contracts[":Test"].bytecode}`;

    const filter = testRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eql(
        await testRegistry.functions.resolver(cfaddress(bytecode, 3))
      );

      simpleContract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await simpleContract.sayHello()).to.eql("hi");
      done();
    };
    const registryContract = testRegistry.on(filter, callback);
    registryContract.functions.deploy(bytecode, 3);
  });

  it("deploys a ProxyContract contract through as owner", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const initcode =
      proxyContract.bytecode +
      ethers.utils.defaultAbiCoder
        .encode(["address"], [simpleContract.address])
        .substr(2);

    const filter = testRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eql(
        await testRegistry.functions.resolver(cfaddress(initcode, 3))
      );

      const contract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await contract.sayHello()).to.eql("hi");
      done();
    };

    const registryContract = testRegistry.on(filter, callback);
    registryContract.functions.deploy(initcode, 3);
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

    const filter = testRegistry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eql(
        await testRegistry.functions.resolver(cfaddress(initcode, 4))
      );

      const contract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await contract.sayHello()).to.equalIgnoreCase(accounts[0]);
      done();
    };

    const registryContract = testRegistry.on(filter, callback);
    registryContract.functions.deploy(initcode, 4);
  });
});
