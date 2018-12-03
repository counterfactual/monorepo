import firebase from "firebase";
import firebasemock from "firebase-mock";

export const A_PRIVATE_KEY = process.env.npm_package_config_unlockedAccount0!;
export const B_PRIVATE_KEY = process.env.npm_package_config_unlockedAccount1!;
export const MOCK_DATABASE: firebase.database.Database = new firebasemock.MockFirebase();
