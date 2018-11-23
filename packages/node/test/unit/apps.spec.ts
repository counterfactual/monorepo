import EventEmitter from "eventemitter3";

import { Node } from "../../src/node";

describe("Basic app operations with the Node", () => {
  let node: Node;
  beforeEach(() => {
    node = new Node();
  });

  it("can get an EventEmitter for an app", () => {
    const appInstanceEventEmitter = node.openApp("1");
    expect(appInstanceEventEmitter).toBeDefined();
    expect(appInstanceEventEmitter).toBeInstanceOf(EventEmitter);
  });

  it("can get empty list of apps", () => {
    const apps = node.getApps();
    expect(apps).toEqual([]);
  });
});
