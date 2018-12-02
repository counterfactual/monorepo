import firebase from "firebase";
import FirebaseServer from "firebase-server";

import { Node } from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";

describe("Two nodes can communicate with each other", () => {
  const firebaseServerPort = process.env.npm_package_config_firebaseServerPort;
  let firebaseServer: FirebaseServer;
  let database: firebase.database.Database;

  beforeEach(() => {
    console.info(`Starting Firebase server on port: ${firebaseServerPort}`);
    firebaseServer = new FirebaseServer(firebaseServerPort, "localhost");

    const app = firebase.initializeApp({
      databaseURL: `ws://localhost:${firebaseServerPort}`,
      projectId: "projectId"
    });

    database = app.database();
  });

  afterEach(() => {
    console.info(`Closing Firebase server on port: ${firebaseServerPort}`);
    firebaseServer.close();
  });

  it("Node A can send messages to Node B", async done => {
    const nodeA = new Node(A_PRIVATE_KEY, database);
    const nodeB = new Node(B_PRIVATE_KEY, database);
    const installMsg = { method: "INSTALL" };

    nodeB.on(Node.PEER_MESSAGE, msg => {
      console.log("got msg", msg);
      done();
    });
    await nodeA.send(nodeB.address, installMsg);
  });
});
