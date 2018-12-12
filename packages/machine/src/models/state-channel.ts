import { AppInstance } from "./app-instance";

export class StateChannel {
  constructor(
    public readonly multisigAddress: string,
    public readonly multisigOwners: string[],
    public apps: Map<string, AppInstance>,
    public freeBalanceAppIndexes: Map<string, number>
  ) {}
}
