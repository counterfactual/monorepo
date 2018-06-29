import { assert } from "chai";
import ethers from "ethers";
import * as solc from "solc";

import * as Utils from "../helpers/utils";

const ProxyContract = artifacts.require("Proxy");
const Registry = artifacts.require("Registry");

contract("Registry", accounts => {
  const web3 = (global as any).web3;

  let registry;
  let simpleContract;

  function salt(i) {
    return ethers.utils.defaultAbiCoder.encode(["uint256"], [i]);
  }

  function cfaddress(bytecode, i) {
    return ethers.utils.solidityKeccak256(
      ["bytes1", "bytes", "bytes32"],
      ["0x19", bytecode, salt(i)]
    );
  }

  before(async () => {
    registry = await Registry.new();
  });

  it("computes counterfactual addresses of bytes deployments", async () => {
    assert.equal(
      cfaddress(Utils.zeroBytes32, salt(1)),
      await registry.getCounterfactualAddress(Utils.zeroBytes32, salt(1))
    );
  });

  it("deploys a contract", async () => {
    const source = `
        contract Test {
            function sayHello() public pure returns (string) {
                return "hi";
      }
        }`;
    const output = await (solc as any).compile(source, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = "0x" + output.contracts[":Test"].bytecode;

    const TestContract = web3.eth.contract(iface);
    const tx = await registry.deploy(bytecode, salt(2));
    simpleContract = Utils.getParamFromTxEvent(
      tx,
      "ContractCreated",
      "deployedAddress",
      registry.address,
      TestContract
    );

    assert.equal(
      await simpleContract.address,
      await registry.isDeployed(cfaddress(bytecode, salt(2)))
    );

    assert.equal("hi", await simpleContract.sayHello());
  });

  it("deploys a contract using msg.sender", async () => {
    const source = `
        contract Test {
            function sayHello() public pure returns (string) {
                return "hi";
            }
        }`;
    const output = await (solc as any).compile(source, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = "0x" + output.contracts[":Test"].bytecode;

    const TestContract = web3.eth.contract(iface);
    const tx = await registry.deploy(bytecode, salt(3));
    const testContract = Utils.getParamFromTxEvent(
      tx,
      "ContractCreated",
      "deployedAddress",
      registry.address,
      TestContract
    );

    assert.equal(
      await testContract.address,
      await registry.isDeployed(cfaddress(bytecode, salt(3)))
    );

    assert.equal("hi", await testContract.sayHello());
  });

  it("deploys a ProxyContract contract through as owner", async () => {
    const initcode =
      ProxyContract.bytecode +
      ethers.utils.defaultAbiCoder
        .encode(["address"], [simpleContract.address])
        .substr(2);

    const TestContract = web3.eth.contract(simpleContract.abi);

    const tx = await registry.deploy(initcode, salt(3));
    const testContract = Utils.getParamFromTxEvent(
      tx,
      "ContractCreated",
      "deployedAddress",
      registry.address,
      TestContract
    );

    assert.equal(
      await testContract.address,
      await registry.isDeployed(cfaddress(initcode, salt(3)))
    );

    assert.equal("hi", await testContract.sayHello());
  });

  it("deploys a contract and passes arguments", async () => {
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
    const output = await (solc as any).compile(source, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = "0x" + output.contracts[":Test"].bytecode;

    const code =
      bytecode +
      ethers.utils.defaultAbiCoder.encode(["address"], [accounts[0]]).substr(2);

    const TestContract = web3.eth.contract(iface);
    const tx = await registry.deploy(code, salt(4));
    const testContract = Utils.getParamFromTxEvent(
      tx,
      "ContractCreated",
      "deployedAddress",
      registry.address,
      TestContract
    );

    assert.equal(
      await testContract.address,
      await registry.isDeployed(cfaddress(code, salt(4)))
    );

    assert.equal(accounts[0], await testContract.sayHello());
  });
});
