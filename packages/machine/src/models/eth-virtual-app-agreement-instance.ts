import { Terms } from "@counterfactual/types";

export type ETHVirtualAppAgreementJson = {
  multisigAddress: string;
  terms: Terms;
  appSeqNo: number;
  rootNonceValue: number;
};

export class ETHVirtualAppAgreement {
  private readonly json: ETHVirtualAppAgreementJson;

  constructor(
    multisigAddress: string,
    terms: Terms,
    appSeqNo: number,
    rootNonceValue: number
  ) {
    this.json = {
      multisigAddress,
      terms,
      appSeqNo,
      rootNonceValue
    };
  }

  public toJson(): ETHVirtualAppAgreementJson {
    return JSON.parse(JSON.stringify(this.json));
  }

  public static fromJson(json: ETHVirtualAppAgreementJson) {
    const ret = new ETHVirtualAppAgreement(
      json.multisigAddress,
      json.terms,
      json.appSeqNo,
      json.rootNonceValue
    );
    return ret;
  }
}
