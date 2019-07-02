import { BigNumber, getAddress, keccak256, solidityPack } from "ethers/utils";

export type TwoPartyVirtualEthAsLumpInstanceJson = {
  multisigAddress: string;
  appSeqNo: number;
  expiry: number;
  capitalProvided: BigNumber;
  targetAppIdentityHash: string;
  beneficiary1: string;
  beneficiary2: string;
};

export class TwoPartyVirtualEthAsLumpInstance {
  private readonly json: TwoPartyVirtualEthAsLumpInstanceJson;

  constructor(
    public multisigAddress: string,
    public appSeqNo: number,
    public expiry: number,
    public capitalProvided: BigNumber,
    public targetAppIdentityHash: string,
    public beneficiary1: string,
    public beneficiary2: string
  ) {
    this.json = {
      multisigAddress,
      appSeqNo,
      expiry,
      capitalProvided,
      targetAppIdentityHash,
      // normalize addresses and fail early on any invalid addresses
      beneficiary1: getAddress(beneficiary1),
      beneficiary2: getAddress(beneficiary2)
    };
  }

  public toJson(): TwoPartyVirtualEthAsLumpInstanceJson {
    return JSON.parse(JSON.stringify(this.json));
  }

  public static fromJson(json: TwoPartyVirtualEthAsLumpInstanceJson) {
    return new TwoPartyVirtualEthAsLumpInstance(
      json.multisigAddress,
      json.appSeqNo,
      json.expiry,
      json.capitalProvided,
      json.targetAppIdentityHash,
      json.beneficiary1,
      json.beneficiary2
    );
  }
  public get uninstallKey() {
    // The unique "key" in the UninstallKeyRegistry is computed to be:
    // hash(<stateChannel.multisigAddress address>, hash(<app sequence number>))
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
