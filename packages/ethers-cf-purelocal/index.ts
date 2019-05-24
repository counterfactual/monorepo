import { ethers } from "ethers";
import VM from "ethereumjs-vm";

const vm = new VM({
  enableHomestead: true,
  activatePrecompiles: true
});
export class PureEvmProvider extends ethers.providers.JsonRpcProvider {
  contracts;
  constructor(...args) {
    super(...args);
    this.contracts = require(`@counterfactual/contracts/networks/${
      this.network.chainId
    }.json`);
  }

  perform(method: string, params: any): Promise<any> {
    switch (method) {
      case "call": {
        return this.callEvm(method, params);
      }
      default:
        return super.perform(method, params);
    }
  }
  callEvm = async (method, params) => {
    let isPure;
    const contractData = this.contracts.find(
      e => e.address.toLowerCase() === params.transaction.to.toLowerCase()
    );
    if (!contractData) {
      return super.perform(method, params);
    }
    const contract = new ethers.utils.Interface(
      require(`@counterfactual/contracts/build/${
        contractData.contractName
      }.json`).abi
    );
    Object.values(contract.functions)
      .filter(
        e =>
          e.type === "call" &&
          contract.abi.find(
            (a: any) => a.name === e.name && a.stateMutability === "pure"
          ) != undefined
      )
      .forEach(f => {
        if (params.transaction.data.includes(f.sighash)) {
          isPure = true;
        }
      });
    if (isPure) {
      await new Promise((resolve, reject) => {
        vm.stateManager.generateGenesis((err, res) => {
          if (err) {
            reject(err);
          }
          resolve(res);
        });
      });
      const bytecode = require(`@counterfactual/contracts/build/${
        contractData.contractName
      }.json`).bytecode;

      const output = await new Promise((resolve, reject) => {vm.runCode({ code: Buffer.from(bytecode, 'hex'), data: Buffer.from(params.transaction.data, 'hex')}, (err, res) => {
        if (err) {
          reject(err);
        }
        resolve(res);
      })})
      return output
    }
    return super.perform(method, params);
  };
}
