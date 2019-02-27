import { JsonRpcProvider } from "ethers/providers";
import { Server } from "http";
import { Log, LogLevel } from "logepi";
import { v4 as generateUUID } from "uuid";
import { ethers } from "ethers";

import mountApi from "@counterfactual/playground-server/src/api";
import { getDatabase } from "@counterfactual/playground-server/src/db";
import NodeWrapper, { serviceFactory } from "@counterfactual/playground-server/src/node";
import {
  Node
} from "@counterfactual/node";
import {
  Node as NodeTypes
} from "@counterfactual/types";

import { connectNode } from "../src/node";

jest.setTimeout(20000);

const api = mountApi();

let server: Server;

const db = getDatabase();

Log.setOutputLevel(LogLevel.ERROR);

const GANACHE_URL = global["ganacheURL"];
const NETWORK_CONTEXT = global["networkContext"];

describe("playground-server", () => {
  let playgroundNode: Node;
  let nodeAlice: Node;
  let nodeBot: Node;

  beforeAll(async () => {
    const provider = new JsonRpcProvider(GANACHE_URL);

    playgroundNode = await NodeWrapper.createNodeSingleton(
      "ganache",
      global["playgroundMnemonic"],
      NETWORK_CONTEXT,
      provider,
      serviceFactory.createStoreService(generateUUID())
    );

    nodeAlice = await NodeWrapper.createNode(
      "ganache",
      NETWORK_CONTEXT,
      provider,
      global["aliceMnemonic"]
    );

    nodeBot = await NodeWrapper.createNode(
      "ganache",
      NETWORK_CONTEXT,
      provider,
      global["botMnemonic"]
    );

    expect(nodeAlice).not.toEqual(nodeBot);
      
    await nodeAlice.call(
      NodeTypes.MethodName.CREATE_CHANNEL,
      {
        params: {
          owners: [nodeAlice.publicIdentifier, playgroundNode.publicIdentifier]
        },
        type: NodeTypes.MethodName.CREATE_CHANNEL,
        requestId: generateUUID()
      }
    );
    
    await nodeBot.call(
      NodeTypes.MethodName.CREATE_CHANNEL,
      {
        params: {
          owners: [nodeBot.publicIdentifier, playgroundNode.publicIdentifier]
        },
        type: NodeTypes.MethodName.CREATE_CHANNEL,
        requestId: generateUUID()
      }
    );

    await db.schema.dropTableIfExists("users");
    await db.schema.createTable("users", table => {
      table.uuid("id");
      table.string("username");
      table.string("email");
      table.string("eth_address");
      table.string("multisig_address");
      table.string("node_address");
      table.unique(["username"], "uk_users__username");
    });
  });

  beforeAll(done => {
    server = api.listen(9001, done);
  });

  afterEach(async done => {
    await db("users").delete();
    done();
  });

  afterAll(done => {
    server.close(done);
  });

  describe("connectNode", () => {
    it("wires the node up to automated ttt responses", async done => {
      let appInstanceId;

      await connectNode(nodeBot, global["botAddress"]);

      nodeAlice.on("installVirtualEvent", (message) => {
        appInstanceId = message.data.params.appInstanceId;

        nodeAlice.call(NodeTypes.MethodName.TAKE_ACTION, {
          type: NodeTypes.MethodName.TAKE_ACTION,
          requestId: generateUUID(),
          params: {
            appInstanceId,
            action: {
              actionType: 0,
              winClaim: { winClaimType: 0, idx: 0 },
              playX: 1,
              playY: 1
            }
          }
        });
      });

      nodeAlice.on("updateStateEvent", (message) => {
        const board = message.data.newState[3];
        expect(board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "1").length).toBe(1);
        expect(board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "2").length).toBe(1);
        expect(message.data.appInstanceId).toBe(appInstanceId);

        done();
      });

      nodeAlice.call(NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL, {
        type: NodeTypes.MethodName.PROPOSE_INSTALL_VIRTUAL,
        requestId: generateUUID(),
        params: {
          intermediaries: [playgroundNode.publicIdentifier],
          proposedToIdentifier: nodeBot.publicIdentifier,
          initialState: {
            players: [global["aliceAddress"], global["botAddress"]],
            turnNum: 0,
            winner: 0,
            board: [[0, 0, 0], [0, 0, 0], [0, 0, 0]]
          },
          appId: NETWORK_CONTEXT["TicTacToe"],
          abiEncodings: {
            actionEncoding:
            "tuple(uint8 actionType, uint256 playX, uint256 playY, tuple(uint8 winClaimType, uint256 idx) winClaim)",
            stateEncoding:
              "tuple(address[2] players, uint256 turnNum, uint256 winner, uint256[3][3] board)"
          },
          asset: {
            assetType: 0
          },
          myDeposit: 0,
          peerDeposit: 0,
          timeout: 100
        }
      });
    });
  });
});
