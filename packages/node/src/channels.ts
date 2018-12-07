import { legacy } from "@counterfactual/cf.js";
import { Address } from "@counterfactual/common-types";

import { IStoreService } from "./service-interfaces";

type Channel = legacy.channel.StateChannelInfo;

export class Channels {
  private readonly channels: Map<string, Channel> = new Map();
  constructor(
    private readonly store: IStoreService,
    private channelAddresses?: Address[]
  ) {}

  async init() {
    if (this.channelAddresses !== undefined) {
      this.channelAddresses.forEach(async (address: Address) => {
        this.channels.set(address, await this.store.get(address));
      });
    }
  }
}
