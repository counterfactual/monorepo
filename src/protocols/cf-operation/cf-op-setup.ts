import { FreeBalance, NetworkContext } from './../../machine/types';
import * as ethers from "ethers";

import * as cfOp from "./cf-operation";
import { StateChannelContext } from "../state-channel";

const TIMEOUT = 100;
function generateNonceCfAddress(uniqueId: number, multisigAddress:string, owners: string[], networkContext: NetworkContext) {
  const initcode = ethers.Contract.getDeployTransaction(
    networkContext.WithdrawAppBytecode,
    []
  ).data;

  const calldata = new ethers.Interface([
    "instantiate(address,address[],address,uint256,uint256)"
  ]).functions.instantiate(
    multisigAddress,
    owners,
    networkContext.RegistryAddress,
    uniqueId,
    TIMEOUT
  ).data;

  return ethers.utils.solidityKeccak256(
    ["bytes1", "bytes", "bytes32"],
    [
      "0x19",
      initcode,
      ethers.utils.solidityKeccak256(["bytes"], [calldata])
    ]
  );
}


function generateFreeBalanceCfAddress(multisigAddress: string, uniqueId: string, owners: string[], networkContext: NetworkContext) {
    const initcode = ethers.Contract.getDeployTransaction(
      networkContext.WithdrawAppBytecode,
      []
    ).data;

    const calldata = new ethers.Interface([
      "instantiate(address,address[],address,uint256,uint256)"
    ]).functions.instantiate(
      multisigAddress,
      owners,
      networkContext.RegistryAddress,
      uniqueId,
      TIMEOUT
    ).data;

    return ethers.utils.solidityKeccak256(
      ["bytes1", "bytes", "bytes32"],
      [
        "0x19",
        initcode,
        ethers.utils.solidityKeccak256(["bytes"], [calldata])
      ]
    );
};

export class CfOpSetup {
  static nonceUpdateOp(nonceId: number, multisigAddress: string, registryAddress: string, ): cfOp.CfOperation {
    const nonce = generateNonceCfAddress(nonceId);

    const nonceStateUpdate = new cfOp.CfAppUpdateAsOwner(
      multisigAddress,
      nonce,
      ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1]),
      1
    );

    return nonceStateUpdate;
  }


  static freeBalanceInstallOp(multisigAddress: string, registryAddress: string, ethId: string, owners: string[], withdrawAppBytecode: string,AssetDispatcherSighashForETH assetDispatcherAddress: string): Array<cfOp.CfOperation> {
    const FREEBAL_ETH_ID = 2;

    const freeBalanceETH = generateFreeBalanceCfAddress(multisigAddress, registryAddress, ethId, owners, withdrawAppBytecode);
    const nonceCfAddress = generateNonceCfAddress(1);

    const conditionalTransferForFreeBalanceETH = new cfOp.CfAppInstall(
      multisigAddress,
      new cfOp.App(
        [
          new cfOp.Condition(
            new cfOp.Function(
              new cfOp.Address(
                registryAddress,
                nonceCfAddress
              ),
              "0xb5d78d8c"
            ),
            "0x",
            ethers.utils.AbiCoder.defaultCoder.encode(["uint256"], [1])
          )
        ],
        new cfOp.Address(
          registryAddress,
          freeBalanceETH
        ),
        [],
        new cfOp.Function(
          new cfOp.Address(
            "0x0000000000000000000000000000000000000000",
            ctx.networkContext["AssetDispatcherAddress"]
          ),
          ctx.networkContext["AssetDispatcherSighashForETH"]
        )
      )
    );

    return [nonceStateUpdate, conditionalTransferForFreeBalanceETH];
  }
}