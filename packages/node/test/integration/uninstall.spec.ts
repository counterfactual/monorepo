import { Node as NodeTypes } from "@counterfactual/types";
import { JsonRpcProvider } from "ethers/providers";
import { v4 as generateUUID } from "uuid";

import { IMessagingService, IStoreService, Node, NodeConfig } from "../../src";
import { APP_INSTANCE_STATUS } from "../../src/db-schema";
import { xkeyKthAddress } from "../../src/machine";
import { ERRORS } from "../../src/methods/errors";
import { MNEMONIC_PATH } from "../../src/signer";
import {
  InstallMessage,
  NODE_EVENTS,
  ProposeMessage,
  UninstallMessage
} from "../../src/types";
import { LocalFirebaseServiceFactory } from "../services/firebase-server";
import { A_MNEMONIC } from "../test-constants.jest";

import {
  confirmProposedAppInstanceOnNode,
  generateUninstallRequest,
  getApps,
  getInstalledAppInstanceInfo,
  getInstalledAppInstances,
  getMultisigCreationTransactionHash,
  getProposedAppInstanceInfo,
  makeInstallProposalRequest,
  makeInstallRequest,
  makeTTTProposalReq
} from "./utils";

describe("Node method follows spec - uninstall", () => {
  jest.setTimeout(50000);

  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let messagingService: IMessagingService;
  let nodeA: Node;
  let storeServiceA: IStoreService;
  let nodeB: Node;
  let storeServiceB: IStoreService;
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
    nodeB = await Node.create(
      messagingService,
      storeServiceB,
      nodeConfig,
      provider,
      global["networkContext"]
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  describe(
    "Node A gets app install proposal, sends to node B, B approves it, installs it," +
      "sends acks back to A, A installs it, then A uninstalls",
    () => {
      it("sends proposal with non-null initial state", async done => {
        const stateEncoding =
          "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)";
        const actionEncoding =
          "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)";

        const initialState = {
          players: [
            xkeyKthAddress(nodeA.publicIdentifier, 0), // <-- winner
            xkeyKthAddress(nodeB.publicIdentifier, 0)
          ],
          turnNum: 0,
          winner: 1, // Hard-coded winner for test
          board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
        };

        nodeA.on(
          NODE_EVENTS.CREATE_CHANNEL,
          async (data: NodeTypes.CreateChannelResult) => {
            expect(await getInstalledAppInstances(nodeA)).toEqual([]);
            expect(await getInstalledAppInstances(nodeB)).toEqual([]);

            let appInstanceId;

            // second, an app instance must be proposed to be installed into that channel
            const appInstanceInstallationProposalRequest = makeTTTProposalReq(
              nodeB.publicIdentifier,
              global["networkContext"].TicTacToe,
              initialState,
              {
                stateEncoding,
                actionEncoding
              }
            );

            // node B then decides to approve the proposal
            nodeB.on(
              NODE_EVENTS.PROPOSE_INSTALL,
              async (msg: ProposeMessage) => {
                confirmProposedAppInstanceOnNode(
                  appInstanceInstallationProposalRequest.params,
                  await getProposedAppInstanceInfo(nodeA, appInstanceId)
                );

                // some approval logic happens in this callback, we proceed
                // to approve the proposal, and install the app instance
                const installRequest = makeInstallRequest(
                  msg.data.appInstanceId
                );
                nodeB.emit(installRequest.type, installRequest);
              }
            );

            nodeA.on(NODE_EVENTS.INSTALL, async (msg: InstallMessage) => {
              const appInstanceNodeA = await getInstalledAppInstanceInfo(
                nodeA,
                appInstanceId
              );
              const appInstanceNodeB = await getInstalledAppInstanceInfo(
                nodeB,
                appInstanceId
              );
              expect(appInstanceNodeA).toEqual(appInstanceNodeB);

              const uninstallReq = generateUninstallRequest(
                msg.data.params.appInstanceId
              );

              nodeA.emit(uninstallReq.type, uninstallReq);
            });

            nodeB.on(NODE_EVENTS.UNINSTALL, async (msg: UninstallMessage) => {
              expect(
                await getApps(nodeA, APP_INSTANCE_STATUS.INSTALLED)
              ).toEqual([]);

              expect(
                await getApps(nodeB, APP_INSTANCE_STATUS.INSTALLED)
              ).toEqual([]);

              done();
            });

            const response = await nodeA.call(
              appInstanceInstallationProposalRequest.type,
              appInstanceInstallationProposalRequest
            );
            appInstanceId = (response.result as NodeTypes.ProposeInstallResult)
              .appInstanceId;
          }
        );

        await getMultisigCreationTransactionHash(nodeA, [
          nodeA.publicIdentifier,
          nodeB.publicIdentifier
        ]);
      });

      it("sends proposal with null initial state", async () => {
        const appInstanceInstallationProposalRequest = makeInstallProposalRequest(
          nodeB.publicIdentifier,
          true
        );

        expect(
          nodeA.call(
            appInstanceInstallationProposalRequest.type,
            appInstanceInstallationProposalRequest
          )
        ).rejects.toEqual(ERRORS.NULL_INITIAL_STATE_FOR_PROPOSAL);
      });
    }
  );
});
