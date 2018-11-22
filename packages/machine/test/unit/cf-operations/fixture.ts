import * as cf from "@counterfactual/cf.js";
import { ethers } from "ethers";

export const TEST_NETWORK_CONTEXT = new cf.legacy.network.NetworkContext(
  "0x1111111111111111111111111111111111111111",
  "0x2222222222222222222222222222222222222222",
  "0x3333333333333333333333333333333333333333",
  "0x4444444444444444444444444444444444444444",
  "0x5555555555555555555555555555555555555555",
  "0x6666666666666666666666666666666666666666",
  "0x7777777777777777777777777777777777777777",
  "0x8888888888888888888888888888888888888888"
);
export const TEST_MULTISIG_ADDRESS = ethers.utils.hexlify(
  "0xCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCCC"
);
export const TEST_SIGNING_KEYS = [
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.utils.SigningKey(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  ),
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.utils.SigningKey(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  )
];
export const TEST_PARTICIPANTS = [
  TEST_SIGNING_KEYS[0].address,
  TEST_SIGNING_KEYS[1].address
];
export const TEST_APP_UNIQUE_ID = 13;
export const TEST_TERMS = new cf.legacy.app.Terms(
  0,
  ethers.utils.parseEther("1.0"),
  ethers.constants.AddressZero
);
export const TEST_APP_INTERFACE = new cf.legacy.app.AppInterface(
  ethers.constants.AddressZero,
  "0x00000000",
  "0x00000000",
  "0x00000000",
  "0x00000000",
  "tuple(address,uint256)"
);
export const TEST_APP_STATE_HASH = ethers.utils.hexlify(
  "0x9999999999999999999999999999999999999999999999999999999999999999"
);
export const TEST_LOCAL_NONCE = 0;
export const TEST_TIMEOUT = 100;

export const TEST_FREE_BALANCE = new cf.legacy.utils.FreeBalance(
  TEST_SIGNING_KEYS[0].address,
  ethers.utils.parseEther("0.5"),
  TEST_SIGNING_KEYS[1].address,
  ethers.utils.parseEther("0.5"),
  0,
  10,
  100,
  new cf.legacy.utils.Nonce(true, 0, 5)
);

export const TEST_FREE_BALANCE_APP_INTERFACE = cf.legacy.utils.FreeBalance.contractInterface(
  TEST_NETWORK_CONTEXT
);

export const TEST_FREE_BALANCE_APP_INSTANCE = new cf.legacy.app.AppInstance(
  TEST_NETWORK_CONTEXT,
  TEST_MULTISIG_ADDRESS,
  TEST_PARTICIPANTS,
  TEST_FREE_BALANCE_APP_INTERFACE,
  cf.legacy.utils.FreeBalance.terms(),
  TEST_FREE_BALANCE.timeout,
  TEST_FREE_BALANCE.uniqueId
);

export const TEST_APP_INSTANCE = new cf.legacy.app.AppInstance(
  TEST_NETWORK_CONTEXT,
  TEST_MULTISIG_ADDRESS,
  TEST_PARTICIPANTS,
  TEST_APP_INTERFACE,
  TEST_TERMS,
  TEST_TIMEOUT,
  TEST_APP_UNIQUE_ID
);

/**
 * Construct contract call data
 * @param funcSig Function signature ABI encoding e.g. "execTransaction(address, uint256, bytes, uint8, bytes)"
 * @param args Arguments to pass to contract call
 */
export function constructContractCall(funcSig: string, ...args: any[]): string {
  const [funcName] = funcSig.split("(");
  return new ethers.utils.Interface([funcSig]).functions[funcName].encode(args);
}

/**
 * Concatenate calls into multiSend() call
 * @param subcalls Transaction data of subcalls
 */
export function constructMultiSend(subcalls: string[]): string {
  return constructContractCall(
    "multiSend(bytes)",
    `0x${subcalls.map(call => call.substr(2)).join("")}`
  );
}

/**
 * Construct contract call to be passed to multiSend().
 * @param operation Type of operation to execute: call or delegatecall
 * @param to Address of contract to call
 * @param value Value to send
 * @param funcSig Function signature ABI encoding e.g. "setState(bytes32, uint256, uint256, bytes)"
 * @param args Arguments to pass to contract call
 */
export function constructMultiSendSubCall(
  operation: "delegatecall" | "call",
  to: string,
  value: string | number,
  funcSig: string,
  args: any[]
): string {
  const data = constructContractCall(funcSig, ...args);
  return ethers.utils.defaultAbiCoder.encode(
    ["uint8", "address", "uint256", "bytes"],
    [operation === "delegatecall" ? 1 : 0, to, value, data]
  );
}

/**
 * Construct call to Multisig execTransaction() proxy function
 * @param operation Type of operation to execute: call or delegatecall
 * @param to Address of contract to call
 * @param value Value to send
 * @param transactionData Transaction data of call
 * @param signatures Signatures of multisig owners for this call
 */
export function constructMultisigExecTransaction(
  operation: "delegatecall" | "call",
  to: string,
  value: string | number,
  transactionData: string,
  signatures: ethers.utils.Signature[]
): string {
  return constructContractCall(
    "execTransaction(address, uint256, bytes, uint8, bytes)",
    to,
    value,
    transactionData,
    operation === "delegatecall" ? 1 : 0,
    cf.utils.signaturesToBytes(...signatures)
  );
}
