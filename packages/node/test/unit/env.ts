import { legacy } from "@counterfactual/cf.js";
import * as ethers from "ethers";
import firebase from "firebase";
import firebasemock from "firebase-mock";

import pkg from "../../../../package.json";

export const privateKey = process.env.npm_package_config_unlockedAccount0!;
export const provider = new ethers.providers.JsonRpcProvider(
  `http://localhost:${pkg.config.ganachePort}`
);
export const firestore: firebase.firestore.Firestore = new firebasemock.MockFirestore();
export const networkContext = legacy.network.EMPTY_NETWORK_CONTEXT;
