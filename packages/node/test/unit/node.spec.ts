import * as ethers from "ethers";
import firebase from "firebase";
import firebasemock from "firebase-mock";

import Node from "../../src/node";
import {
  Address,
  AppInstanceInfo,
  MethodName,
  MethodRequest,
  MethodResponse
} from "../../src/node-types";

describe("Node operations", () => {
  const privateKey = process.env.npm_package_config_unlockedAccount0!;
  const provider = ethers.getDefaultProvider() as ethers.providers.Web3Provider;
  let firestore: firebase.firestore.Firestore;
  let networkContext: Map<string, Address>;

  beforeEach(() => {
    firestore = new firebasemock.MockFirestore();
    networkContext = new Map<string, Address>();
    networkContext.set("AppRegistry", ethers.constants.AddressZero);
  });

  it("exists", () => {
    expect(Node).toBeDefined();
  });

  it("can be instantiated", () => {
    const node = new Node(privateKey, provider, firestore, networkContext);
    expect(node).toBeDefined();
  });

  it("can create a multisig", async () => {
    const node = new Node(privateKey, provider, firestore, networkContext);
    const multisig = await node.createMultisig(ethers.constants.AddressZero);
    expect(multisig).toBeDefined();
  });

  it("can accept call to get app instances", done => {
    const node = new Node(privateKey, provider, firestore, networkContext);
    const requestId = "1";
    const req: MethodRequest = {
      requestId,
      type: MethodName.GET_APP_INSTANCES,
      params: {}
    };

    // Set up listener for the method response
    node.on(req.type, (res: MethodResponse) => {
      expect(res.result).toEqual({
        appInstances: [] as AppInstanceInfo[]
      });
      done();
    });

    // Make the method call
    node.emit(req.type, req);
  });
});
