import { Node } from "../../src";
import {
  AppInstanceInfo,
  MethodName,
  MethodRequest,
  MethodResponse
} from "../../src/node-types";

import { A_PRIVATE_KEY, MOCK_FIRESTORE } from "../env";

describe("Node method follows spec - getAppInstances", () => {
  it("can accept a valid call to get app instances", done => {
    const node = new Node(A_PRIVATE_KEY, MOCK_FIRESTORE);
    const requestId = "1";
    const req: MethodRequest = {
      requestId,
      type: MethodName.GET_APP_INSTANCES,
      params: {}
    };

    // Set up listener for the method response
    node.on(req.type, (res: MethodResponse) => {
      expect(req.type).toEqual(res.type);
      expect(res.requestId).toEqual(requestId);
      expect(res.result).toEqual({
        appInstances: [] as AppInstanceInfo[]
      });
      done();
    });

    // Make the method call
    node.emit(req.type, req);
  });
});
