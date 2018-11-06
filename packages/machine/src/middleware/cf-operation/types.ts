import * as cf from "@counterfactual/cf.js";
import AppInstanceJson from "@counterfactual/contracts/build/contracts/AppInstance.json";
import MultiSendJson from "@counterfactual/contracts/build/contracts/MultiSend.json";
import * as ethers from "ethers";

import * as abi from "../../abi";
const { keccak256 } = ethers.utils;

export abstract class CfOperation {
  public abstract hashToSign(): cf.utils.H256;

  public abstract transaction(sigs: cf.utils.Signature[]): Transaction;
}

export class CfAppInterface {
  public static generateSighash(
    abiInterface: ethers.utils.Interface,
    functionName: string
  ): string {
    return abiInterface.functions[functionName]
      ? abiInterface.functions[functionName].sighash
      : "0x00000000";
  }

  constructor(
    readonly address: cf.utils.Address,
    readonly applyAction: cf.utils.Bytes4,
    readonly resolve: cf.utils.Bytes4,
    readonly getTurnTaker: cf.utils.Bytes4,
    readonly isStateTerminal: cf.utils.Bytes4,
    readonly stateEncoding: string
  ) {}

  public encode(state: object): string {
    return abi.encode([this.stateEncoding], [state]);
  }

  public stateHash(state: object): string {
    // assumes encoding "tuple(type key, type key, type key)"
    return keccak256(this.encode(state));
  }

  public hash(): string {
    if (this.address === "0x0") {
      // FIXME:
      // https://github.com/counterfactual/monorepo/issues/119
      console.error(
        "WARNING: Can't compute hash for AppInterface because its address is 0x0"
      );
      return ethers.constants.HashZero;
    }
    return keccak256(
      abi.encode(
        [
          "tuple(address addr, bytes4 applyAction, bytes4 resolve, bytes4 getTurnTaker, bytes4 isStateTerminal)"
        ],
        [
          {
            addr: this.address,
            applyAction: this.applyAction,
            resolve: this.resolve,
            getTurnTaker: this.getTurnTaker,
            isStateTerminal: this.isStateTerminal
          }
        ]
      )
    );
  }
}

export class Terms {
  constructor(
    readonly assetType: number,
    readonly limit: ethers.utils.BigNumber,
    readonly token: cf.utils.Address
  ) {}

  public hash(): string {
    return keccak256(
      abi.encode(
        ["bytes1", "uint8", "uint256", "address"],
        ["0x19", this.assetType, this.limit, this.token]
      )
    );
  }
}

export enum Operation {
  Call = 0,
  Delegatecall = 1
}

export class Transaction {
  constructor(
    readonly to: cf.utils.Address,
    readonly value: number,
    readonly data: string
  ) {}
}

export class MultisigTransaction extends Transaction {
  constructor(
    readonly to: cf.utils.Address,
    readonly value: number,
    readonly data: cf.utils.Bytes,
    readonly operation: Operation
  ) {
    super(to, value, data);
  }
}

export class MultisigInput {
  constructor(
    readonly to: cf.utils.Address,
    readonly val: number,
    readonly data: cf.utils.Bytes,
    readonly op: Operation,
    readonly signatures?: cf.utils.Signature[]
  ) {}
}

export class MultiSend {
  constructor(
    readonly transactions: MultisigInput[],
    readonly networkContext: cf.utils.NetworkContext
  ) {}

  public input(multisend: cf.utils.Address): MultisigInput {
    let txs: string = "0x";
    for (const transaction of this.transactions) {
      txs += abi
        .encode(
          ["uint256", "address", "uint256", "bytes"],
          [transaction.op, transaction.to, transaction.val, transaction.data]
        )
        .substr(2);
    }

    const data = new ethers.utils.Interface(
      MultiSendJson.abi
    ).functions.multiSend.encode([txs]);
    return new MultisigInput(multisend, 0, data, Operation.Delegatecall);
  }
}

/**
 * The state of a free balance object. Passing this into an install or uninstall
 * will update the free balance object to the values given here.
 */
export class CfFreeBalance {
  public static terms(): Terms {
    // FIXME: Change implementation of free balance on contracts layer
    // https://github.com/counterfactual/monorepo/issues/118
    return new Terms(
      0, // 0 means ETH
      ethers.utils.parseEther("0.001"), // FIXME: un-hardcode (https://github.com/counterfactual/monorepo/issues/117)
      ethers.constants.AddressZero
    );
  }

  public static contractInterface(
    ctx: cf.utils.NetworkContext
  ): CfAppInterface {
    const address = ctx.paymentAppAddr;
    const applyAction = "0x00000000"; // not used
    const resolver = new ethers.utils.Interface([
      // TODO: Put this somewhere eh
      // https://github.com/counterfactual/monorepo/issues/134
      "resolve(tuple(address,address,uint256,uint256),tuple(uint8,uint256,address))"
    ]).functions.resolve.sighash;
    const turn = "0x00000000"; // not used
    const isStateTerminal = "0x00000000"; // not used
    return new CfAppInterface(
      address,
      applyAction,
      resolver,
      turn,
      isStateTerminal,
      "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)"
    );
  }

  constructor(
    readonly alice: cf.utils.Address, // first person in free balance object
    readonly aliceBalance: ethers.utils.BigNumber,
    readonly bob: cf.utils.Address, // second person in free balance object
    readonly bobBalance: ethers.utils.BigNumber,
    readonly uniqueId: number,
    readonly localNonce: number,
    readonly timeout: number,
    readonly dependencyNonce: CfNonce
  ) {}
}

export class CfNonce {
  public isSet: boolean;
  public salt: cf.utils.Bytes32;
  public nonceValue: number;

  constructor(isSet: boolean, uniqueId: number, nonceValue: number) {
    this.isSet = isSet;
    this.salt = keccak256(abi.encodePacked(["uint256"], [uniqueId]));
    this.nonceValue = nonceValue;
  }
}

/**
 * Maps 1-1 with AppInstance.sol (with the addition of the uniqueId, which
 * is used to calculate the cf address).
 *
 * @param signingKeys *must* be in sorted lexicographic order.
 */
export class CfAppInstance {
  constructor(
    readonly ctx: cf.utils.NetworkContext,
    readonly owner: cf.utils.Address,
    readonly signingKeys: cf.utils.Address[],
    readonly cfApp: CfAppInterface,
    readonly terms: Terms,
    readonly timeout: number,
    readonly uniqueId: number
  ) {}

  public cfAddress(): cf.utils.H256 {
    const initcode = new ethers.utils.Interface(
      AppInstanceJson.abi
    ).deployFunction.encode(this.ctx.linkedBytecode(AppInstanceJson.bytecode), [
      this.owner,
      this.signingKeys,
      this.cfApp.hash(),
      this.terms.hash(),
      this.timeout
    ]);

    return keccak256(
      abi.encodePacked(
        ["bytes1", "bytes", "uint256"],
        ["0x19", initcode, this.uniqueId]
      )
    );
  }
}
