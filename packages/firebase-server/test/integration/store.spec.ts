import { WRITE_NULL_TO_FIREBASE } from "@counterfactual/firebase-client";
import { Node } from "@counterfactual/types";
import { v4 as generateUUID } from "uuid";

import { LocalFirebaseServiceFactory } from "../../src";

describe("Storage client can get / set", () => {
  let firebaseServiceFactory: LocalFirebaseServiceFactory;
  let storeService: Node.IStoreService;
  const valueOne = "0x111";
  const valueTwo = "0x222";

  beforeAll(async () => {
    firebaseServiceFactory = new LocalFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    storeService = firebaseServiceFactory.createStoreService(
      process.env.FIREBASE_STORE_SERVER_KEY!
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  it("can save and retrieve a key-value pair", async () => {
    const key = generateUUID();
    const value = generateUUID();
    await storeService.set([{ key, value }]);
    expect(await storeService.get(key)).toBe(value);
  });

  it("rejects null entries", async () => {
    const key = generateUUID();
    const value = {
      a: "a",
      b: "b",
      c: {
        x: "x",
        y: null
      }
    };
    await expect(storeService.set([{ key, value }])).rejects.toThrowError(
      WRITE_NULL_TO_FIREBASE
    );
  });

  it("can save values under nested keys", async () => {
    await storeService.set([{ key: "A/0x111", value: valueOne }]);
    await storeService.set([{ key: "A/0x222", value: valueTwo }]);
    expect(await storeService.get("A")).toEqual({
      "0x111": valueOne,
      "0x222": valueTwo
    });
  });

  it("can save values under nested keys in one call", async () => {
    await storeService.set([
      { key: "A/0x111", value: valueOne },
      { key: "A/0x222", value: valueTwo }
    ]);
    expect(await storeService.get("A")).toEqual({
      "0x111": valueOne,
      "0x222": valueTwo
    });
  });
});
