import { randomBytes } from "crypto";
import { Arrayish } from "ethers/utils";

export default class JsonRpcSignerMock {
  async signMessage(message: Arrayish): Promise<string> {
    return `0x${randomBytes(message.length).toString("hex")}`;
  }
}
