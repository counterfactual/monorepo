import {
  FirebaseServiceFactory,
  Node,
  NodeMessage
} from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";

const { INSTALL, REJECT_INSTALL } = NodeTypes.EventName;

const serviceFactory = new FirebaseServiceFactory({
  apiKey: "AIzaSyA5fy_WIAw9mqm59mdN61CiaCSKg8yd4uw",
  authDomain: "foobar-91a31.firebaseapp.com",
  databaseURL: "https://foobar-91a31.firebaseio.com",
  projectId: "foobar-91a31",
  storageBucket: "foobar-91a31.appspot.com",
  messagingSenderId: "432199632441"
});

const node = new Node(
  process.env.NODE_PRIVATE_KEY as string,
  serviceFactory.createMessagingService("messaging"),
  serviceFactory.createStoreService("storage"),
  {
    STORE_KEY_PREFIX: "store"
  }
);

node.on(INSTALL, async (msg: NodeMessage) => {
  console.log("INSTALL event:", msg);
});

node.on(REJECT_INSTALL, async (msg: NodeMessage) => {
  console.log("REJECT_INSTALL event:", msg);
});

export default node;
