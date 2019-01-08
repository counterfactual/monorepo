// TODO: Refactor this. The only real middleware here is "handleError",
// the rest are controllers.
import createAccount from "./create-account";
import handleError from "./error";
import getApps from "./get-apps";
import matchmake from "./matchmake";

export { createAccount, getApps, handleError, matchmake };
