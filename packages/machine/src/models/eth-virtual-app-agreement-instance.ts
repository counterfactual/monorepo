import { Terms } from "@counterfactual/types";
import { BigNumber, getAddress, keccak256, solidityPack } from "ethers/utils";

export type ETHVirtualAppAgreementJson = {
  multisigAddress: string;
  terms: Terms;
  appSeqNo: number;
  rootNonceValue: number;
  expiry: number;
  capitalProvided: BigNumber;
  targetAppIdentityHash: string;
  beneficiary1: string;
  beneficiary2: string;
};

export class ETHVirtualAppAgreementInstance {
  private readonly json: ETHVirtualAppAgreementJson;

  constructor(
    public multisigAddress: string,
    public terms: Terms,
    public appSeqNo: number,
    public rootNonceValue: number,
    public expiry: number,
    public capitalProvided: BigNumber,
    public targetAppIdentityHash: string,
    public beneficiary1: string,
    public beneficiary2: string
  ) {
    this.json = {
      multisigAddress,
      terms,
      appSeqNo,
      rootNonceValue,
      expiry,
      capitalProvided,
      targetAppIdentityHash,
      // normalize addresses and fail early on any invalid addresses
      beneficiary1: getAddress(beneficiary1),
      beneficiary2: getAddress(beneficiary2)
    };
  }

  public toJson(): ETHVirtualAppAgreementJson {
    return JSON.parse(JSON.stringify(this.json));
  }

  public static fromJson(json: ETHVirtualAppAgreementJson) {
    return new ETHVirtualAppAgreementInstance(
      json.multisigAddress,
      json.terms,
      json.appSeqNo,
      json.rootNonceValue,
      json.expiry,
      json.capitalProvided,
      json.targetAppIdentityHash,
      json.beneficiary1,
      json.beneficiary2
    );
  }
  public get uninstallKey() {
    // The unique "key" in the NonceRegistry is computed to be:
    // hash(<stateChannel.multisigAddress address>, <timeout = 0>, hash(<app nonce>))
    return keccak256(
      solidityPack(
        ["address", "uint256", "bytes32"],
        [
          this.json.multisigAddress,
          0,
          keccak256(solidityPack(["uint256"], [this.json.appSeqNo]))
        ]
      )
    );
  }
}
