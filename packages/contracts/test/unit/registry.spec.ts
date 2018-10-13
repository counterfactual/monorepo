import { assert } from "chai";
import * as ethers from "ethers";
import * as solc from "solc";

import * as Utils from "@counterfactual/test-utils";

const ProxyContract = artifacts.require("Proxy");
const Registry = artifacts.require("Registry");

contract("Registry", accounts => {
  const web3 = (global as any).web3;

  let registry;
  let simpleContract;

  function cfaddress(initcode, i) {
    return ethers.utils.solidityKeccak256(
      ["bytes1", "bytes", "uint256"],
      ["0x19", initcode, i]
    );
  }

  before(async () => {
    registry = await Registry.new();
  });

  it("computes counterfactual addresses of bytes deployments", async () => {
    assert.equal(
      cfaddress(Utils.ZERO_BYTES32, 1),
      await registry.cfaddress(Utils.ZERO_BYTES32, 1)
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
    const tx = await registry.deploy(bytecode, 2);
    simpleContract = Utils.getParamFromTxEvent(
      tx,
      "ContractCreated",
      "deployedAddress",
      registry.address,
      TestContract
    );

    assert.equal(
      await simpleContract.address,
      await registry.resolver(cfaddress(bytecode, 2))
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
    const tx = await registry.deploy(bytecode, 3);
    const testContract = Utils.getParamFromTxEvent(
      tx,
      "ContractCreated",
      "deployedAddress",
      registry.address,
      TestContract
    );

    assert.equal(
      await testContract.address,
      await registry.resolver(cfaddress(bytecode, 3))
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

    const tx = await registry.deploy(initcode, 3);
    const testContract = Utils.getParamFromTxEvent(
      tx,
      "ContractCreated",
      "deployedAddress",
      registry.address,
      TestContract
    );

    assert.equal(
      await testContract.address,
      await registry.resolver(cfaddress(initcode, 3))
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
    const tx = await registry.deploy(code, 4);
    const testContract = Utils.getParamFromTxEvent(
      tx,
      "ContractCreated",
      "deployedAddress",
      registry.address,
      TestContract
    );

    assert.equal(
      await testContract.address,
      await registry.resolver(cfaddress(code, 4))
    );

    assert.equal(accounts[0], await testContract.sayHello());
  });
});
