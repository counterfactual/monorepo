import firebase from "firebase";
import FirebaseServer from "firebase-server";

import { Node } from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";

describe("Two nodes can communicate with each other", () => {
  const firebaseServerPort = process.env.npm_package_config_firebaseServerPort;
  let firebaseServer: FirebaseServer;
  let database: firebase.database.Database;
  let nodeA: Node;
  let nodeB: Node;

  beforeAll(() => {
    firebaseServer = new FirebaseServer(firebaseServerPort, "localhost");

    const app = firebase.initializeApp(
      {
        databaseURL: `ws://localhost:${firebaseServerPort}`,
        projectId: "projectId"
      },
      Math.random().toString()
    );
    database = app.database();
    nodeA = new Node(A_PRIVATE_KEY, database);
    nodeB = new Node(B_PRIVATE_KEY, database);
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("Node A can send messages to Node B", async done => {
    const msg = { method: "INSTALL" };

    nodeB.on(Node.PEER_MESSAGE, msg => {
      expect(msg.from).toEqual(nodeA.address);
      expect(msg.method).toEqual(msg.method);
      done();
    });
    await nodeA.send(nodeB.address, msg);
  });

  it("Node A can syn-ack with Node B", async done => {
    const synMsg = { phase: "SYN" };
    const ackMsg = { phase: "ACK" };

    nodeA.on(Node.PEER_MESSAGE, async msg => {
      expect(msg.from).toEqual(nodeB.address);
      expect(msg.phase).toEqual(ackMsg.phase);
      done();
    });

    nodeB.on(Node.PEER_MESSAGE, async msg => {
      expect(msg.from).toEqual(nodeA.address);
      expect(msg.phase).toEqual(synMsg.phase);
      await nodeB.send(nodeA.address, ackMsg);
    });

    nodeA.send(nodeB.address, synMsg);
  });
});
