import * as ethers from "ethers";

// @ts-ignore
import { Web3Provider } from "ethers/providers";

import * as Multisig from "./multisig";
import * as Utils from "./utils";

const MinimumViableMultisig = artifacts.require("MinimumViableMultisig");
const ProxyFactory = artifacts.require("ProxyFactory");
const ProxyContract = artifacts.require("Proxy");
const RegistryCall = artifacts.require("RegistryCall");

export async function deployThroughProxyFactory(contract, data) {
  const proxyFactory = await ProxyFactory.deployed();
  return Utils.getParamFromTxEvent(
    await (proxyFactory as any).createProxy(contract.address, data),
    "ProxyCreation",
    "proxy",
    proxyFactory.address,
    contract
  );
}

export async function deployApp(
  app,
  owner,
  signingKeys,
  id,
  registry,
  deltaTimeout
) {
  return deployThroughProxyFactory(
    app,
    new ethers.Interface(app.abi).functions.instantiate.encode([
      owner,
      signingKeys,
      id,
      registry,
      deltaTimeout
    ])
  );
}

export async function deployMultisig(owners) {
  return deployThroughProxyFactory(
    MinimumViableMultisig,
    new ethers.Interface(MinimumViableMultisig.abi).functions.setup.encode([
      owners
    ])
  );
}

export function getCFHelper(
  multisig: ethers.Contract,
  registry: ethers.Contract,
  provider: Web3Provider
) {
  return {
    cfaddressOf: contract => {
      if (contract.address) {
        return {
          addr: ethers.utils.defaultAbiCoder.encode(
            ["bytes32"],
            [contract.address]
          ),
          registry: Utils.zeroAddress
        };
      } else {
        return {
          addr: contract.cfaddress,
          registry: registry.address
        };
      }
    },
    deploy: async (truffleContract: any, cargs?: any[]) => {
      const id = Math.floor(Math.random() * 100);

      const initcode = new ethers.Interface(
        truffleContract.abi
      ).deployFunction.encode(truffleContract.binary, cargs || []);

      const salt = ethers.utils.solidityKeccak256(["uint256"], [id]);

      await registry.functions.deploy(initcode, salt, {
        gasLimit: 4712388,
        gasPrice: await provider.getGasPrice()
      });

      const cfaddress = ethers.utils.solidityKeccak256(
        ["bytes1", "bytes", "bytes32"],
        ["0x19", initcode, salt]
      );

      const address = await registry.functions.isDeployed(cfaddress);

      const contract = new ethers.Contract(
        address,
        truffleContract.abi,
        // @ts-ignore: ethers bug, no argument works too
        provider.getSigner()
      );

      return { cfaddress, contract };
    },
    deployApp: async (
      app: any, // TODO: Import TruffleContract type.
      signer: ethers.Wallet
    ) => {
      const id = Math.floor(Math.random() * 100);

      const initcode = new ethers.Interface(
        ProxyContract.abi
      ).deployFunction.encode(ProxyContract.bytecode, [app.address]);

      const calldata = new ethers.Interface(
        app.abi
      ).functions.instantiate.encode([
        multisig.address,
        [signer.address],
        registry.address,
        id,
        10
      ]);

      await registry.functions.deployAndCall(initcode, calldata, {
        gasLimit: 4712388,
        gasPrice: await provider.getGasPrice()
      });

      const cfaddress = ethers.utils.solidityKeccak256(
        ["bytes1", "bytes", "bytes32"],
        [
          "0x19",
          initcode,
          ethers.utils.solidityKeccak256(["bytes"], [calldata])
        ]
      );

      const address = await registry.functions.isDeployed(cfaddress);

      const contract = new ethers.Contract(
        address,
        app.abi,
        // @ts-ignore: ethers bug, no argument works too
        provider.getSigner()
      );

      return { cfaddress, contract };
    },
    deployAppWithState: async (
      app: any, // TODO: Import TruffleContract type.
      appStateType: string,
      state: any,
      signer: ethers.Wallet
    ) => {
      const id = Math.floor(Math.random() * 100);

      const initcode = new ethers.Interface(
        ProxyContract.abi
      ).deployFunction.encode(ProxyContract.bytecode, [app.address]);

      const calldata = new ethers.Interface(
        app.abi
      ).functions.instantiate.encode([
        multisig.address,
        [signer.address],
        registry.address,
        id,
        10
      ]);

      await registry.functions.deployAndCall(initcode, calldata, {
        gasLimit: 4712388,
        gasPrice: await provider.getGasPrice()
      });

      const cfaddress = ethers.utils.solidityKeccak256(
        ["bytes1", "bytes", "bytes32"],
        [
          "0x19",
          initcode,
          ethers.utils.solidityKeccak256(["bytes"], [calldata])
        ]
      );

      const address = await registry.functions.isDeployed(cfaddress);

      const contract = new ethers.Contract(
        address,
        app.abi,
        // @ts-ignore: ethers bug, no argument works too
        provider.getSigner()
      );

      const updateHash = ethers.utils.solidityKeccak256(
        ["bytes1", "uint256", "bytes", "uint256"],
        [
          "0x19",
          id,
          ethers.utils.defaultAbiCoder.encode([appStateType], [state]),
          1
        ]
      );

      await (contract as any).setAppStateWithSigningKeys(
        // TODO: Generalize.
        //       This is helpful for this helper function, but confusing
        app.contractName === "BytesApp"
          ? ethers.utils.defaultAbiCoder.encode([appStateType], [state])
          : state,
        1,
        Utils.signMessageBytes(updateHash, [signer]),
        {
          gasLimit: 4712388,
          gasPrice: await provider.getGasPrice()
        }
      );

      return { cfaddress, contract };
    },
    async call(to, signer, data) {
      return this.fn(Multisig.Operation.Call, to, signer, data);
    },
    async delegatecall(to, signer, data) {
      return this.fn(Multisig.Operation.Delegatecall, to, signer, data);
    },
    async proxyCall(cfobject, signer, fnName, fnArgs) {
      return this.proxyFn("proxyCall", cfobject, signer, fnName, fnArgs);
    },
    async proxyDelegatecall(cfobject, signer, fnName, fnArgs) {
      return this.proxyFn(
        "proxyDelegatecall",
        cfobject,
        signer,
        fnName,
        fnArgs
      );
    },
    fn: async (callType, to, signer, data) => {
      return Multisig.executeTxData(data, to, multisig, [signer], callType);
    },
    proxyFn: async (callType, cfobject, signer, fnName, fnArgs) => {
      const data = new ethers.Interface(RegistryCall.abi).functions[
        callType
      ].encode([
        registry.address,
        cfobject.cfaddress,
        new ethers.Interface(cfobject.contract.interface.abi).functions[
          fnName
        ].encode(fnArgs || [])
      ]);

      return Multisig.executeTxData(
        data,
        (RegistryCall as any).address,
        multisig,
        [signer],
        Multisig.Operation.Delegatecall
      );
    }
  };
}
