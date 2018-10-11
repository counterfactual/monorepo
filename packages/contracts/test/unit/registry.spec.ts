import * as Utils from "@counterfactual/test-utils";
import * as ethers from "ethers";
import * as solc from "solc";
import { AbstractContract, expect } from "../../utils";

contract("Registry", accounts => {
  const web3 = (global as any).web3;
  const { unlockedAccount } = Utils.setupTestEnv(web3);

  let registry: ethers.Contract;
  let simpleContract: ethers.Contract;
  let ProxyContract: AbstractContract;

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
    ProxyContract = await AbstractContract.loadBuildArtifact("Proxy");
    const Registry = await AbstractContract.loadBuildArtifact("Registry");

    registry = await Registry.deploy(unlockedAccount);
  });

  it("computes counterfactual addresses of bytes deployments", async () => {
    expect(cfaddress(Utils.ZERO_BYTES32, 1)).to.eql(
      await registry.cfaddress(Utils.ZERO_BYTES32, 1)
    );
  });

  it.skip("deploys a contract", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = "0x" + output.contracts[":Test"].bytecode;

    const filter = registry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eql(
        await registry.resolver(cfaddress(bytecode, 2))
      );
      simpleContract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await simpleContract.sayHello()).to.eql("hi");
      done();
    };
    const registryContract = registry.on(filter, callback);
    registryContract.deploy(bytecode, 2);
  });

  it.skip("deploys a contract using msg.sender", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const bytecode = "0x" + output.contracts[":Test"].bytecode;

    const filter = registry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eql(
        await registry.resolver(cfaddress(bytecode, 3))
      );

      simpleContract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await simpleContract.sayHello()).to.eql("hi");
      done();
    };
    const registryContract = registry.on(filter, callback);
    registryContract.deploy(bytecode, 3);
  });

  it.skip("deploys a ProxyContract contract through as owner", done => {
    const output = (solc as any).compile(simpleContractSource, 0);
    const iface = JSON.parse(output.contracts[":Test"].interface);
    const initcode =
      ProxyContract.bytecode +
      ethers.utils.defaultAbiCoder
        .encode(["address"], [simpleContract.address])
        .substr(2);

    const filter = registry.filters.ContractCreated(null, null);
    const callback = async (from, to, value, event) => {
      const deployedAddress = value.args.deployedAddress;
      expect(deployedAddress).to.eql(
        await registry.resolver(cfaddress(initcode, 3))
      );

      const contract = new ethers.Contract(
        deployedAddress,
        iface,
        unlockedAccount
      );
      expect(await contract.sayHello()).to.eql("hi");
      done();
    };

    const registryContract = registry.on(filter, callback);
    registryContract.deploy(initcode, 3);
  });

  it.skip("deploys a contract and passes arguments", async () => {
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

    await testContract.address.should.eql(
      await registry.resolver(cfaddress(code, 4))
    );

    await testContract.sayHello().should.eql(accounts[0]);
  });
});
