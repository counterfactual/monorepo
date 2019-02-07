import { AddressZero } from "ethers/constants";

import { IMessagingService } from "../../src";

import TestFirebaseServiceFactory from "./services/firebase-service";

describe("Two nodes can communicate with each other", () => {
  let firebaseServiceFactory: TestFirebaseServiceFactory;
  let messagingService: IMessagingService;

  beforeAll(() => {
    firebaseServiceFactory = new TestFirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
  });

  afterAll(() => {
    firebaseServiceFactory.closeServiceConnections();
  });

  it("can setup listeners for events through messaging service", done => {
    const address = AddressZero;
    const testMsg = {
      event: "testEvent",
      data: {
        some: "data"
      }
    };

    messagingService.onReceive(address, (msg: any) => {
      expect(msg.event).toEqual(testMsg.event);
      expect(msg.data).toEqual(testMsg.data);
      done();
    });

    messagingService.send(address, testMsg as any);
  });
});
