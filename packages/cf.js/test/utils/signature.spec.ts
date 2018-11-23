import * as ethers from "ethers";

import { signaturesToBytes, signaturesToSortedBytes } from "../../src/utils";

const privateKey =
  "0x0123456789012345678901234567890123456789012345678901234567890123";
const signingKey = new ethers.utils.SigningKey(privateKey);

const signaturesAndDigests = ["sig1", "sig3", "sig2"].map(message => {
  const bytes = ethers.utils.toUtf8Bytes(message);
  const digest = ethers.utils.keccak256(bytes);
  const signature = signingKey.signDigest(digest);

  return {
    digest,
    signature
  };
});
const signatures = signaturesAndDigests.map(sad => sad.signature);
const digests = signaturesAndDigests.map(sad => sad.digest);

describe("Utils / signature", async () => {
  it("can convert signatures to bytes", () => {
    expect(signaturesToBytes(...signatures)).toEqual(
      "0xe8a215dbd1bdee474c9ac2877644cc90006a8634cf3d0ef3645475f8933f871929b3cf1ed0ac9f6cfb5005c67a5fad6838e77da00a5c081c40b894b9cb3c6a5e1c60bd9ccc9dc25ec2d7277ff67da3452d7c8ccf8eb766fffa469f223519ad794e6725f4251f6f51953a0682fe935a1cc075f8c79114cbbc472bda7a009aa9c24a1b1682d103015d56a15e5bb1901c8fced10291e6cffcab7f580a628337943a760b2bb85c1b9b961c4e01512ac13791d6b28a1bbf8bb7d787b23bda20fc981225131c"
    );
  });

  it("can convert signatures to sorted bytes", () => {
    expect(signaturesToSortedBytes(digests[0], ...signatures)).toEqual(
      "0x60bd9ccc9dc25ec2d7277ff67da3452d7c8ccf8eb766fffa469f223519ad794e6725f4251f6f51953a0682fe935a1cc075f8c79114cbbc472bda7a009aa9c24a1be8a215dbd1bdee474c9ac2877644cc90006a8634cf3d0ef3645475f8933f871929b3cf1ed0ac9f6cfb5005c67a5fad6838e77da00a5c081c40b894b9cb3c6a5e1c1682d103015d56a15e5bb1901c8fced10291e6cffcab7f580a628337943a760b2bb85c1b9b961c4e01512ac13791d6b28a1bbf8bb7d787b23bda20fc981225131c"
    );
  });
});
