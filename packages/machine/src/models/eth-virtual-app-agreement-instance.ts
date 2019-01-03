import { Terms } from "@counterfactual/types";

export type ETHVirtualAppAgreementJson = {
  multisigAddress: string;
  terms: Terms;
  appSeqNo: number;
  rootNonceValue: number;
  expiry: number;
  capitalProvided: number;
};

export class ETHVirtualAppAgreementInstance {
  private readonly json: ETHVirtualAppAgreementJson;

  constructor(
    public multisigAddress: string,
    public terms: Terms,
    public appSeqNo: number,
    public rootNonceValue: number,
    // todo(ldct): bignumberify
    public expiry: number,
    public capitalProvided: number
  ) {
    this.json = {
      multisigAddress,
      terms,
      appSeqNo,
      rootNonceValue,
      expiry,
      capitalProvided
    };
  }

  public toJson(): ETHVirtualAppAgreementJson {
    return JSON.parse(JSON.stringify(this.json));
  }

  public static fromJson(json: ETHVirtualAppAgreementJson) {
    const ret = new ETHVirtualAppAgreementInstance(
      json.multisigAddress,
      json.terms,
      json.appSeqNo,
      json.rootNonceValue,
      json.expiry,
      json.capitalProvided
    );
    return ret;
  }
}
