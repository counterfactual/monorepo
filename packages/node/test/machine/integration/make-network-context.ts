import { NetworkContext, networkContextProps } from "@counterfactual/types";

export function makeNetworkContext(networkId: number): NetworkContext {
  const preNetworkContext = {} as any;

  const deployedContracts = require(`../../../networks/${networkId}.json`);

  deployedContracts.forEach((val: any) => {
    const { contractName, address } = val;
    if (networkContextProps.includes(contractName)) {
      preNetworkContext[contractName] = address;
    }
  });

  for (const contractName of networkContextProps) {
    if (!preNetworkContext[contractName]) {
      throw Error(
        `Could not construct network context, ${contractName} not found`
      );
    }
  }

  return preNetworkContext as NetworkContext;
}
