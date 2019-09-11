import MinimumViableMultisig from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/MinimumViableMultisig.json";
import Proxy from "@counterfactual/cf-funding-protocol-contracts/expected-build-artifacts/Proxy.json";
import { Node } from "@counterfactual/types";
import {
  getAddress,
  Interface,
  keccak256,
  solidityKeccak256,
  solidityPack
} from "ethers/utils";
import { jsonRpcMethod } from "rpc-server";

import { xkeysToSortedKthAddresses } from "../../../machine";
import { RequestHandler } from "../../../request-handler";
import { NodeController } from "../../controller";

export default class GetStateDepositHolderAddressController extends NodeController {
  public readonly methodName =
    Node.RpcMethodName.GET_STATE_DEPOSIT_HOLDER_ADDRESS;
  public static readonly methodName =
    Node.RpcMethodName.GET_STATE_DEPOSIT_HOLDER_ADDRESS;

  @jsonRpcMethod(Node.RpcMethodName.GET_STATE_DEPOSIT_HOLDER_ADDRESS)
  public executeMethod = super.executeMethod;

  protected async executeMethodImplementation(
    requestHandler: RequestHandler,
    params: Node.GetStateDepositHolderAddressParams
  ): Promise<Node.GetStateDepositHolderAddressResult> {
    const { owners } = params;
    const { networkContext } = requestHandler;

    const multisigOwners = xkeysToSortedKthAddresses(owners, 0);

    const setupData = new Interface(
      MinimumViableMultisig.abi
    ).functions.setup.encode([multisigOwners]);

    const address = getAddress(
      solidityKeccak256(
        ["bytes1", "address", "uint256", "bytes32"],
        [
          "0xff",
          networkContext.ProxyFactory,
          solidityKeccak256(["bytes32", "uint256"], [keccak256(setupData), 0]),
          keccak256(
            solidityPack(
              ["bytes", "uint256"],
              [
                `0x${Proxy.evm.bytecode.object}`,
                networkContext.MinimumViableMultisig
              ]
            )
          )
        ]
      ).slice(-40)
    );

    return { address };
  }
}
