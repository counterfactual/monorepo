declare module "ethereum-waffle" {
  import { Web3Provider } from "ethers/providers";
  import { Contract, Wallet } from "ethers";
  import * as waffle from "ethereum-waffle";

  type ContractJSON = {
    abi: any;
    evm: any
  };

  export function solidity(chai, utils): void;

  export function createMockProvider(ganacheOptions = {}): Web3Provider;

  export async function getWallets(provider: Web3Provider): Promise<Wallet[]>;

  export async function deployContract(
    wallet: Wallet,
    contractJSON: ContractJSON,
    args?: any[],
    overrideOptions?: object
  ): Promise<Contract>;

  export const link: (
    contract: ContractJSON,
    libraryName: string,
    libraryAddress: string
  ) => void;
}

declare namespace Chai {
  interface Assertion
    extends LanguageChains,
      NumericComparison,
      TypeComparison {
    reverted: Assertion;
    revertedWith(revertReason: string): Assertion;
    emit(contract: Contract, eventName: string): Assertion;
  }
}
