import { abi } from "../../src/utils";

const encoded255 =
  "0x00000000000000000000000000000000000000000000000000000000000000ff";

describe("Utils / abi", async () => {
  it("can encode values when provided a type", () => {
    expect(abi.encode(["uint8"], [255])).toEqual(encoded255);
  });

  it("can decode data when provided a type", () => {
    expect(abi.decode(["uint8"], encoded255)).toEqual([255]);
  });

  it("can compute the solidity packed data when provided types and values", () => {
    expect(
      abi.encodePacked(["int8", "bytes1", "string"], [-1, "0x42", "hello"])
    ).toEqual("0xff4268656c6c6f");
  });
});
