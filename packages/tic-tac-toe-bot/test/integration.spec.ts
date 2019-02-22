import { JsonRpcProvider } from "../../../node_modules/ethers/providers";
import { Server } from "http";
import { Log, LogLevel } from "logepi";
import { v4 as generateUUID } from "uuid";

import mountApi from "../../playground-server/src/api";
import { getDatabase } from "../../playground-server/src/db";
import NodeWrapper, { serviceFactory } from "../../playground-server/src/node";

import { connectNode } from "../src/index";

jest.setTimeout(10000);

const api = mountApi();

let server: Server;

const db = getDatabase();

Log.setOutputLevel(LogLevel.ERROR);

const GANACHE_URL = global["ganacheURL"];
const NETWORK_CONTEXT = global["networkContext"];

describe("playground-server", () => {
  let botNode;
  let nodeAlice;
  let nodeBob;
  let nodeCharlie;

  beforeAll(async () => {
    const provider = new JsonRpcProvider(GANACHE_URL);

    botNode = await NodeWrapper.createNodeSingleton(
      "ganache",
      NETWORK_CONTEXT,
      provider,
      global["botMnemonic"],
      serviceFactory.createStoreService(generateUUID())
    );

    nodeAlice = await NodeWrapper.createNode(
      "ganache",
      NETWORK_CONTEXT,
      provider,
      global["nodeAMnemonic"]
    );

    nodeBob = await NodeWrapper.createNode(
      "ganache",
      NETWORK_CONTEXT,
      provider,
      global["nodeBMnemonic"]
    );

    nodeCharlie = await NodeWrapper.createNode(
      "ganache",
      NETWORK_CONTEXT,
      provider,
      global["nodeCMnemonic"]
    );

    expect(nodeAlice).not.toEqual(nodeBob);
    expect(nodeAlice).not.toEqual(nodeCharlie);

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

  describe("/api/apps", () => {
    it("gets a list of apps", async done => {
      await connectNode(botNode);

      nodeAlice.on("takeActionEvent", (message) => {
        const board = message.data[3];
        expect(board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "1").length).toBe(1);
        expect(board.flat().filter((val) => ethers.utils.bigNumberify(val).toString() === "2").length).toBe(1);

        done();
      });

      await nodeAlice.call("proposeInstallVirtual", {
        type: "proposeInstallVirtual",
        requestId: generateUUID()
      });

      await nodeAlice.call("takeAction", {
        type: "takeAction",
        requestId: generateUUID()
      });
    });
  });
});
