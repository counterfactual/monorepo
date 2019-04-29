import { Node as NodeTypes } from "@counterfactual/types";
import { Wallet } from "ethers";
import { One, Zero } from "ethers/constants";
import {
  JsonRpcProvider,
  Provider,
  TransactionRequest
} from "ethers/providers";
import { parseEther } from "ethers/utils";
import { fromMnemonic } from "ethers/utils/hdnode";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { MNEMONIC_PATH } from "../../src/signer";
import {
  InstallVirtualMessage,
  NODE_EVENTS,
  ProposeVirtualMessage
} from "../../src/types";
import { CF_PATH } from "../global-setup.jest";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";

import {
  collateralizeChannel,
  confirmProposedVirtualAppInstanceOnNode,
  getApps,
  getMultisigCreationTransactionHash,
  getProposedAppInstances,
  makeInstallVirtualProposalRequest,
  makeInstallVirtualRequest,
  sleep
} from "./utils";

describe("Node method follows spec - proposeInstallVirtual", () => {
  jest.setTimeout(35000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
  let nodeC: Node;
  let storeServiceC: IStoreService;
  let nodeConfig: NodeConfig;
  let provider: JsonRpcProvider;

  beforeAll(async () => {
    firebaseServiceFactory = new LocalFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
    nodeConfig = {
      STORE_KEY_PREFIX: process.env.FIREBASE_STORE_PREFIX_KEY!
    };

    provider = new JsonRpcProvider(global["ganacheURL"]);

    storeServiceA = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );

    // generate new mnemonics so owner addresses are different for creating
    // a channel in this suite
    const { A_MNEMONIC, B_MNEMONIC } = await generateNewFundedMnemonics(
      global["fundedPrivateKey"],
      provider
    );

    storeServiceA.set([{ key: MNEMONIC_PATH, value: A_MNEMONIC }]);
    nodeA = await Node.create(
      messagingService,
      storeServiceA,
      nodeConfig,
      provider,
      global["networkContext"]
    );

    storeServiceB = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    storeServiceB.set([{ key: MNEMONIC_PATH, value: B_MNEMONIC }]);
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      global["networkContext"]
    );

    storeServiceC = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY! + generateUUID()
    );
    nodeC = await Node.create(
      messagingService,
      storeServiceC,
      nodeConfig,
      provider,
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });
  describe(
    "Node A makes a proposal through an intermediary Node B to install a " +
      "Virtual AppInstance with Node C. All Nodes confirm receipt of proposal",
    () => {
      it("sends proposal with non-null initial state", async done => {
        let abChannelMultisigAddress;
        let bcChannelMultisigAddress;

        nodeB.once(
          NODE_EVENTS.CREATE_CHANNEL,
          async (res: NodeTypes.CreateChannelResult) => {
            // FIXME:(nima) node event emitters don't use consistent interface
            // @ts-ignore
            abChannelMultisigAddress = res.data.multisigAddress;
          }
        );

        nodeA.once(
          NODE_EVENTS.CREATE_CHANNEL,
          async (data: NodeTypes.CreateChannelResult) => {
            while (!abChannelMultisigAddress) {
              console.log("Waiting for Node A and B to sync on new channel");
              await sleep(500);
            }

            await collateralizeChannel(nodeA, nodeB, data.multisigAddress);

            nodeB.once(
              NODE_EVENTS.CREATE_CHANNEL,
              async (res: NodeTypes.CreateChannelResult) => {
                // FIXME:(nima) node event emitters don't use consistent interface
                // @ts-ignore
                bcChannelMultisigAddress = res.multisigAddress;
              }
            );

            nodeC.once(
              NODE_EVENTS.CREATE_CHANNEL,
              async (res: NodeTypes.CreateChannelResult) => {
                while (!bcChannelMultisigAddress) {
                  console.log(
                    "Waiting for Node B and C to sync on new channel"
                  );
                  await sleep(500);
                }

                await collateralizeChannel(
                  nodeB,
                  nodeC,
                  // FIXME:(nima) node event emitters don't use consistent interface
                  // @ts-ignore
                  res.data.multisigAddress
                );

                const intermediaries = [nodeB.publicIdentifier];
                const installVirtualAppInstanceProposalRequest = makeInstallVirtualProposalRequest(
                  nodeC.publicIdentifier,
                  intermediaries,
                  false,
                  One,
                  Zero
                );

                nodeA.once(
                  NODE_EVENTS.INSTALL_VIRTUAL,
                  async (msg: InstallVirtualMessage) => {
                    const virtualAppInstanceNodeA = (await getApps(
                      nodeA,
                      APP_INSTANCE_STATUS.INSTALLED
                    ))[0];

                    const virtualAppInstanceNodeC = (await getApps(
                      nodeC,
                      APP_INSTANCE_STATUS.INSTALLED
                    ))[0];

                    expect(virtualAppInstanceNodeA.myDeposit).toEqual(One);
                    expect(virtualAppInstanceNodeA.peerDeposit).toEqual(Zero);
                    expect(virtualAppInstanceNodeC.myDeposit).toEqual(Zero);
                    expect(virtualAppInstanceNodeC.peerDeposit).toEqual(One);

                    delete virtualAppInstanceNodeA.myDeposit;
                    delete virtualAppInstanceNodeA.peerDeposit;
                    delete virtualAppInstanceNodeC.myDeposit;
                    delete virtualAppInstanceNodeC.peerDeposit;

                    expect(virtualAppInstanceNodeA).toEqual(
                      virtualAppInstanceNodeC
                    );
                    done();
                  }
                );

                nodeC.once(
                  NODE_EVENTS.PROPOSE_INSTALL_VIRTUAL,
                  async (msg: ProposeVirtualMessage) => {
                    const proposedAppInstanceA = (await getProposedAppInstances(
                      nodeA
                    ))[0];
                    const proposedAppInstanceC = (await getProposedAppInstances(
                      nodeC
                    ))[0];

                    confirmProposedVirtualAppInstanceOnNode(
                      installVirtualAppInstanceProposalRequest.params,
                      proposedAppInstanceA
                    );
                    confirmProposedVirtualAppInstanceOnNode(
                      installVirtualAppInstanceProposalRequest.params,
                      proposedAppInstanceC,
                      true
                    );

                    expect(proposedAppInstanceC.proposedByIdentifier).toEqual(
                      nodeA.publicIdentifier
                    );
                    expect(proposedAppInstanceA.id).toEqual(
                      proposedAppInstanceC.id
                    );

                    const installVirtualReq = makeInstallVirtualRequest(
                      msg.data.appInstanceId,
                      msg.data.params.intermediaries
                    );
                    nodeC.emit(installVirtualReq.type, installVirtualReq);
                  }
                );

                const response = await nodeA.call(
                  installVirtualAppInstanceProposalRequest.type,
                  installVirtualAppInstanceProposalRequest
                );
                const appInstanceId = (response.result as NodeTypes.ProposeInstallVirtualResult)
                  .appInstanceId;
                expect(appInstanceId).toBeDefined();
              }
            );
            await getMultisigCreationTransactionHash(nodeB, [
              nodeB.publicIdentifier,
              nodeC.publicIdentifier
            ]);
          }
        );
        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });
    }
  );
});

async function generateNewFundedMnemonics(
  fundedPrivateKey: string,
  provider: Provider
) {
  const fundedWallet = new Wallet(fundedPrivateKey, provider);
  const A_MNEMONIC = Wallet.createRandom().mnemonic;
  const B_MNEMONIC = Wallet.createRandom().mnemonic;

  const signerAPrivateKey = fromMnemonic(A_MNEMONIC).derivePath(CF_PATH)
    .privateKey;
  const signerBPrivateKey = fromMnemonic(B_MNEMONIC).derivePath(CF_PATH)
    .privateKey;

  const signerAAddress = new Wallet(signerAPrivateKey).address;
  const signerBAddress = new Wallet(signerBPrivateKey).address;

  const transactionToA: TransactionRequest = {
    to: signerAAddress,
    value: parseEther("0.1").toHexString()
  };
  const transactionToB: TransactionRequest = {
    to: signerBAddress,
    value: parseEther("0.1").toHexString()
  };
  await fundedWallet.sendTransaction(transactionToA);
  await fundedWallet.sendTransaction(transactionToB);
  return {
    A_MNEMONIC,
    B_MNEMONIC
  };
}
