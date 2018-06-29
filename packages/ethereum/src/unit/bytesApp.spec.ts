import { assert } from "chai";
import * as ethers from "ethers";

import * as CFHelper from "../helpers/cfhelpers";
import * as Utils from "../helpers/utils";

const Registry = artifacts.require("Registry");
const BytesApp = artifacts.require("BytesApp");

const APP_ID = 999999;
const TIMEOUT_LENGTH = 10;

contract("BytesApp", accounts => {
  const web3 = (global as any).web3;

  const provider = new ethers.providers.Web3Provider(web3.currentProvider);

  // 0x8F286b71aB220078df4B41Bc29437F6f39cf5e0e
  const signer = new ethers.Wallet(
    "0x5ab8c0e8aad7ba98efc87d45346eb2be32363ee920e6a6ee9e6afe4041ee952e"
  );

  let app: ethers.Contract;
  let blockNumberOnDeploy: number;

  const getUpdateHash = (id: number, encodedAppState: string, nonce: number) =>
    ethers.utils.solidityKeccak256(
      ["bytes1", "uint256", "bytes", "uint256"],
      ["0x19", id, encodedAppState, nonce]
    );

  const getFinalizeHash = (id: number, nonce: number) =>
    ethers.utils.solidityKeccak256(
      ["bytes1", "uint256", "uint256", "bytes4"],
      ["0x19", id, nonce, "0xa63f2db0"]
    );

  beforeEach(async () => {
    const contract = await CFHelper.deployApp(
      BytesApp,
      accounts[0], // owner
      [signer.address], // signingKeys
      (Registry as any).address, // registry
      APP_ID, // unique id
      TIMEOUT_LENGTH // timeout block numbers
    );
    blockNumberOnDeploy = await provider.getBlockNumber();
    app = new ethers.Contract(
      contract.address,
      contract.abi,
      provider.getSigner(accounts[0])
    );
  });

  it("should be able to retrieve the latest nonce", async () => {
    assert.equal(await app.functions.latestNonce(), 0);
  });

  it("should be able to retrieve the timeout deadline", async () => {
    assert.equal(
      await app.functions.finalizesAt(),
      blockNumberOnDeploy + TIMEOUT_LENGTH
    );
  });

  it("should be able to retrieve the app status", async () => {
    assert.equal(await app.functions.isFinal(), false);
  });

  describe("updating app state", async () => {
    let sendUpdateToChainWithNonce: (
      nonce: number,
      appState?: string
    ) => Promise<void>;

    before(
      async (): Promise<void> => {
        const gasPrice = await provider.getGasPrice();
        sendUpdateToChainWithNonce = (nonce: number, appState?: string) =>
          app.functions.setAppStateAsOwner(
            appState || Utils.zeroBytes32,
            nonce,
            { gasLimit: 5e6, gasPrice }
          );
      }
    );

    describe("with owner", async () => {
      it("should work with higher nonce", async () => {
        assert.equal(await app.functions.latestNonce(), 0);
        await sendUpdateToChainWithNonce(1);
        assert.equal(await app.functions.latestNonce(), 1);
      });

      it("should work many times", async () => {
        assert.equal(await app.functions.latestNonce(), 0);
        await sendUpdateToChainWithNonce(1);
        assert.equal(await app.functions.latestNonce(), 1);
        await sendUpdateToChainWithNonce(2);
        assert.equal(await app.functions.latestNonce(), 2);
        await sendUpdateToChainWithNonce(3);
        assert.equal(await app.functions.latestNonce(), 3);
      });

      it("should work with much higher nonce", async () => {
        assert.equal(await app.functions.latestNonce(), 0);
        await sendUpdateToChainWithNonce(1000);
        assert.equal(await app.functions.latestNonce(), 1000);
      });

      it("shouldn't work with an equal nonce", async () => {
        await Utils.assertRejects(sendUpdateToChainWithNonce(0));
        assert.equal(await app.functions.latestNonce(), 0);
      });

      it("shouldn't work with an lower nonce", async () => {
        await app.functions.setAppStateAsOwner(Utils.zeroBytes32, 1);
        await Utils.assertRejects(
          app.functions.setAppStateAsOwner(Utils.zeroBytes32, 0)
        );
        assert.equal(await app.functions.latestNonce(), 1);
      });

      it("should work with state of many lengths", async () => {
        let nonce = 0;
        for (const len of [1, 2, 4, 8, 16, 32, 64, 128]) {
          const bytes = ethers.utils.hexlify(ethers.utils.randomBytes(len));
          assert.equal(await app.functions.latestNonce(), nonce++);
          await sendUpdateToChainWithNonce(nonce, bytes);
          assert.equal(await app.functions.latestNonce(), nonce);
          assert.equal(await app.functions.getExternalState(), bytes);
        }
      });
    });

    describe("with signing keys", async () => {
      let sendSignedUpdateToChainWithNonce: (
        nonce: number,
        appState?: string
      ) => Promise<void>;

      before(
        async (): Promise<void> => {
          const gasPrice = await provider.getGasPrice();
          sendSignedUpdateToChainWithNonce = (
            nonce: number,
            appState?: string
          ) =>
            app.functions.setAppStateWithSigningKeys(
              appState || Utils.zeroBytes32,
              nonce,
              Utils.signMessageVRS(
                getUpdateHash(APP_ID, appState || Utils.zeroBytes32, nonce),
                [signer]
              ),
              { gasLimit: 5e6, gasPrice }
            );
        }
      );

      it("should work with higher nonce", async () => {
        assert.equal(await app.functions.latestNonce(), 0);
        await sendSignedUpdateToChainWithNonce(1);
        assert.equal(await app.functions.latestNonce(), 1);
      });

      it("should work with multiple updates", async () => {
        assert.equal(await app.functions.latestNonce(), 0);
        await sendSignedUpdateToChainWithNonce(1);
        assert.equal(await app.functions.latestNonce(), 1);
        await sendSignedUpdateToChainWithNonce(2);
        assert.equal(await app.functions.latestNonce(), 2);
        await sendSignedUpdateToChainWithNonce(3);
        assert.equal(await app.functions.latestNonce(), 3);
      });

      it("should work with much higher nonce", async () => {
        assert.equal(await app.functions.latestNonce(), 0);
        await sendSignedUpdateToChainWithNonce(1);
        assert.equal(await app.functions.latestNonce(), 1);
      });

      it("shouldn't work with an equal nonce", async () => {
        assert.equal(await app.functions.latestNonce(), 0);
        await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
        assert.equal(await app.functions.latestNonce(), 0);
      });

      it("shouldn't work with an lower nonce", async () => {
        assert.equal(await app.functions.latestNonce(), 0);
        await sendSignedUpdateToChainWithNonce(1);
        assert.equal(await app.functions.latestNonce(), 1);
        await Utils.assertRejects(sendSignedUpdateToChainWithNonce(0));
        assert.equal(await app.functions.latestNonce(), 1);
      });

      it("should work with state of many lengths", async () => {
        let nonce = 0;
        for (const len of [1, 2, 4, 8, 16, 32, 64, 128]) {
          const bytes = ethers.utils.hexlify(ethers.utils.randomBytes(len));
          assert.equal(await app.functions.latestNonce(), nonce++);
          await sendSignedUpdateToChainWithNonce(nonce, bytes);
          assert.equal(await app.functions.latestNonce(), nonce);
          assert.equal(await app.functions.getExternalState(), bytes);
        }
      });
    });
  });

  describe("finalizing app state", async () => {
    const sendSignedFinalizationToChainWithNonce = (nonce: number) =>
      app.functions.finalizeWithSigningKeys(
        Utils.signMessageVRS(getFinalizeHash(APP_ID, nonce), [signer])
      );

    it("should work with owner", async () => {
      assert.equal(await app.functions.isFinal(), false);
      await app.functions.finalizeAsOwner();
      assert.equal(await app.functions.isFinal(), true);
    });

    it("should work with keys", async () => {
      assert.equal(await app.functions.isFinal(), false);
      await sendSignedFinalizationToChainWithNonce(0);
      assert.equal(await app.functions.isFinal(), true);
    });

    it("should not work with keys if end nonce is outdated", async () => {
      assert.equal(await app.functions.isFinal(), false);
      app.functions.setAppStateAsOwner(Utils.zeroBytes32, 1);
      await Utils.assertRejects(sendSignedFinalizationToChainWithNonce(0));
      assert.equal(await app.functions.isFinal(), false);
    });
  });

  describe("waiting for timeout", async () => {
    it("should block updates after the timeout", async () => {
      assert.equal(await app.functions.isFinal(), false);
      await Utils.mineBlocks(TIMEOUT_LENGTH);
      assert.equal(await app.functions.isFinal(), true);
      await Utils.assertRejects(
        app.functions.setAppStateAsOwner(Utils.zeroBytes32, 1)
      );
    });
  });
});
