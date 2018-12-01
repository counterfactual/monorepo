import { Node } from "../../src";
import {
  AppInstanceInfo,
  MethodName,
  MethodRequest,
  MethodResponse
} from "../../src/node-types";

import { firestore, networkContext, privateKey, provider } from "./env";

describe("Node method - getAppInstances", () => {
  it("can accept valid call to get app instances", done => {
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
