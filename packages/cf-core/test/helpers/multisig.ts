import ethers from "ethers";

export const Operation = Object.freeze({
  Call: 0,
  Create: 2,
  Delegatecall: 1
});

/**
 * Executes a transaction from the multisig to itself according to
 * to the given data.
 *
 * @param data is the contract abi to invoke the correct function with args.
 * @param multisig is the multisig sending and receiving the tx.
 * @param wallets is the array of wallets signing off on the tx.
 * @param op is the Operation to use, i.e., Call, Delegatecall, or Create.
 */
export async function executeTxData(data, toAddr, multisig, wallets, op) {
  const value = 0;

  const transactionHash = await multisig.getTransactionHash(
    toAddr,
    value,
    data,
    op
  );

  const signatures = sign(transactionHash, wallets);
  return multisig.execTransaction(
    toAddr,
    value,
    data,
    op,
    signatures.v,
    signatures.r,
    signatures.s,
    {
      gasLimit: 4712388
    }
  );
}

export function sign(data, wallets) {
  const sortedWallets = wallets.slice().sort((w1, w2) => {
    return w1.address < w2.address ? -1 : w1.address === w2.address ? 0 : 1;
  });
  const v: number[] = [];
  const r: string[] = [];
  const s: string[] = [];
  sortedWallets.forEach(wallet => {
    const sig = new ethers.SigningKey(wallet.privateKey).signDigest(data);
    v.push(sig.recoveryParam + 27);
    r.push(sig.r);
    s.push(sig.s);
  });

  return { v, r, s };
}
