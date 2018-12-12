import dotenv from "dotenv";
import { ethers } from "ethers";
import FirebaseServer from "firebase-server";

import { IMessagingService } from "../../src";

import FirebaseServiceFactory from "./services/firebase-service";

dotenv.config();

describe("Two nodes can communicate with each other", () => {
  let firebaseServer: FirebaseServer;
  let messagingService: IMessagingService;

  beforeAll(() => {
    const firebaseServiceFactory = new FirebaseServiceFactory(
      process.env.FIREBASE_DEV_SERVER_HOST!,
      process.env.FIREBASE_DEV_SERVER_PORT!
    );
    firebaseServer = firebaseServiceFactory.createServer();
    messagingService = firebaseServiceFactory.createMessagingService(
      process.env.FIREBASE_MESSAGING_SERVER_KEY!
    );
  });

  afterAll(() => {
    firebaseServer.close();
  });

  it("can setup listeners for events through messaging service", done => {
    const address = ethers.constants.AddressZero;
    const testMsg = {
      event: "testEvent",
      data: {
        some: "data"
      }
    };
    messagingService.receive(address, msg => {
      expect(msg.event).toEqual(testMsg.event);
      expect(msg.data).toEqual(testMsg.data);
      done();
    });
    messagingService.send(address, testMsg as any);
  });
});
