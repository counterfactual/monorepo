import * as firebase from "firebase";
import FirebaseServer from "firebase-server";
import "firebase/firestore";

import { Node } from "../../src";

import { A_PRIVATE_KEY, B_PRIVATE_KEY } from "../env";

describe("Two nodes can communicate with each other", () => {
  const firebaseServerPort = process.env.npm_package_config_firebaseServerPort;
  let firebaseServer: FirebaseServer;
  let firestore: firebase.firestore.Firestore;

  beforeEach(() => {
    console.info(`Starting Firebase server on port: ${firebaseServerPort}`);
    firebaseServer = new FirebaseServer(firebaseServerPort, "localhost");

    const app = firebase.initializeApp({
      databaseURL: `ws://localhost:${firebaseServerPort}`,
      projectId: "projectId"
    });
    firestore = app.firestore();
  });

  afterEach(() => {
    console.info(`Closing Firebase server on port: ${firebaseServerPort}`);
    firebaseServer.close();
  });

  it("Node A can send messages to Node B", () => {
    const nodeA = new Node(A_PRIVATE_KEY, firestore);
    const nodeB = new Node(B_PRIVATE_KEY, firestore);
    console.log(nodeA);
    console.log(nodeB);
  });
});
