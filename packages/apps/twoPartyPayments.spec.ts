import { ethers } from "ethers";

import { AbstractContract, expect } from "../../utils";
import * as Utils from "../../utils/misc";

const web3 = (global as any).web3;
const { unlockedAccount } = Utils.setupTestEnv(web3);

const [A, B] = [
  // 0xb37e49bFC97A948617bF3B63BC6942BB15285715
  new ethers.Wallet(
    "0x4ccac8b1e81fb18a98bbaf29b9bfe307885561f71b76bd4680d7aec9d0ddfcfd"
  ),
  // 0xaeF082d339D227646DB914f0cA9fF02c8544F30b
  new ethers.Wallet(
    "0x3570f77380e22f8dc2274d8fd33e7830cc2d29cf76804e8c21f4f7a6cc571d27"
  )
];

const getUpdateHash = (stateHash: string, nonce: number, timeout: number) =>
  ethers.utils.solidityKeccak256(
    ["bytes1", "address[]", "uint256", "uint256", "bytes32"],
    ["0x19", [A.address, B.address], nonce, timeout, stateHash]
  );

contract("PaymentApp", (accounts: string[]) => {
  let pc: ethers.Contract;
  let testAppInstance: ethers.Contract;

  enum AssetType {
    ETH,
    ERC20,
    ANY
  }

  const exampleState = {
    alice: A.address,
    bob: B.address,
    aliceBalance: Utils.UNIT_ETH,
    bobBalance: Utils.UNIT_ETH
  };

  const encode = (encoding: string, state: any) =>
    ethers.utils.defaultAbiCoder.encode([encoding], [state]);

  const latestNonce = async () => testAppInstance.functions.latestNonce();

  // TODO: Wait for this to work:
  // ethers.utils.formatParamType(iface.functions.resolve.inputs[0])
  // github.com/ethers-io/ethers.js/blob/typescript/src.ts/utils/abi-coder.ts#L301
  const pcEncoding =
    "tuple(address alice, address bob, uint256 aliceBalance, uint256 bobBalance)";

  const appEncoding =
    "tuple(address addr, bytes4 applyAction, bytes4 resolve, bytes4 getTurnTaker, bytes4 isStateTerminal)";

  const termsEncoding = "tuple(uint8 assetType, uint256 limit, address token)";

  const keccak256 = (bytes: string) =>
    ethers.utils.solidityKeccak256(["bytes"], [bytes]);

  const sendSignedFinalizationToChain = async (stateHash: string) =>
    testAppInstance.functions.setState(
      stateHash,
      await latestNonce(),
      0,
      Utils.signMessage(
        getUpdateHash(
          stateHash || ethers.constants.HashZero,
          await latestNonce(),
          0
        ),
        unlockedAccount
      )
    );

  let app;
  let terms;
  beforeEach(async () => {
    const paymentApp = await AbstractContract.fromArtifactName("PaymentApp");
    pc = await paymentApp.deploy(unlockedAccount);

    // Specifically for the AppInstance
    const appInstance = artifacts.require("AppInstance");
    const transfer = artifacts.require("Transfer");
    appInstance.link("Transfer", transfer.address);

    app = {
      addr: pc.address,
      resolve: pc.interface.functions.resolve.sighash,
      applyAction: "0x00000000",
      getTurnTaker: "0x00000000",
      isStateTerminal: "0x00000000"
    };

    terms = {
      assetType: AssetType.ETH,
      limit: Utils.UNIT_ETH.mul(2),
      token: ethers.constants.AddressZero
    };

    const contractFactory = new ethers.ContractFactory(
      appInstance.abi,
      appInstance.binary,
      unlockedAccount
    );

    testAppInstance = await contractFactory.deploy(
      accounts[0],
      [A.address, B.address],
      keccak256(encode(appEncoding, app)),
      keccak256(encode(termsEncoding, terms)),
      10
    );
  });

  it("should resolve to payments", async () => {
    const ret = await pc.functions.resolve(exampleState, terms);
    expect(ret.assetType).to.be.eql(AssetType.ETH);
    expect(ret.token).to.be.equalIgnoreCase(ethers.constants.AddressZero);
    expect(ret.to[0]).to.be.equalIgnoreCase(A.address);
    expect(ret.to[1]).to.be.equalIgnoreCase(B.address);
    expect(ret.value[0]).to.be.eql(new ethers.utils.BigNumber(Utils.UNIT_ETH));
    expect(ret.value[1]).to.be.eql(new ethers.utils.BigNumber(Utils.UNIT_ETH));
  });

  describe("setting a resolution", async () => {
    it("should fail before state is settled", async () => {
      const finalState = encode(pcEncoding, exampleState);
      await Utils.assertRejects(
        testAppInstance.functions.setResolution(
          app,
          finalState,
          encode(termsEncoding, terms)
        )
      );
    });
    it("should succeed after state is settled", async () => {
      const finalState = encode(pcEncoding, exampleState);
      await sendSignedFinalizationToChain(keccak256(finalState));
      await testAppInstance.functions.setResolution(
        app,
        finalState,
        encode(termsEncoding, terms)
      );
      const ret = await testAppInstance.functions.getResolution();
      expect(ret.assetType).to.be.eql(AssetType.ETH);
      expect(ret.token).to.be.equalIgnoreCase(ethers.constants.AddressZero);
      expect(ret.to[0]).to.be.equalIgnoreCase(A.address);
      expect(ret.to[1]).to.be.equalIgnoreCase(B.address);
      expect(ret.value[0]).to.be.eql(
        new ethers.utils.BigNumber(Utils.UNIT_ETH)
      );
      expect(ret.value[1]).to.be.eql(
        new ethers.utils.BigNumber(Utils.UNIT_ETH)
      );
    });
  });
});
