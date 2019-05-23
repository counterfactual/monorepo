"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("@counterfactual/types");
const utils_1 = require("ethers/utils");
const node_fetch_1 = __importDefault(require("node-fetch"));
const uuid_1 = require("uuid");
const bot_1 = require("./bot");
const API_TIMEOUT = 30000;
const DELAY_SECONDS = process.env.DELAY_SECONDS
    ? Number(process.env.DELAY_SECONDS)
    : 5;
const delay = (ms) => new Promise(res => setTimeout(res, ms));
async function getFreeBalance(node, multisigAddress) {
    const query = {
        type: types_1.Node.MethodName.GET_FREE_BALANCE_STATE,
        requestId: uuid_1.v4(),
        params: { multisigAddress }
    };
    const { result } = await node.call(query.type, query);
    return result;
}
exports.getFreeBalance = getFreeBalance;
function logEthFreeBalance(freeBalance) {
    console.info(`Channel's free balance`);
    for (const key in freeBalance) {
        console.info(key, utils_1.formatEther(freeBalance[key]));
    }
}
exports.logEthFreeBalance = logEthFreeBalance;
async function fetchMultisig(baseURL, token) {
    const bot = await getUser(baseURL, token);
    if (!bot.multisigAddress) {
        console.info(`The Bot doesn't have a channel with the Playground yet...Waiting for another ${DELAY_SECONDS} seconds`);
        await delay(DELAY_SECONDS * 1000).then(() => fetchMultisig(baseURL, token));
    }
    return (await getUser(baseURL, token)).multisigAddress;
}
exports.fetchMultisig = fetchMultisig;
async function deposit(node, amount, multisigAddress) {
    const myFreeBalanceAddress = node.ethFreeBalanceAddress;
    const preDepositBalances = await getFreeBalance(node, multisigAddress);
    if (Object.keys(preDepositBalances).length !== 2) {
        throw new Error("Unexpected number of entries");
    }
    if (!preDepositBalances[myFreeBalanceAddress]) {
        throw new Error("My address not found");
    }
    const [counterpartyFreeBalanceAddress] = Object.keys(preDepositBalances).filter(addr => addr !== myFreeBalanceAddress);
    console.log(`\nDepositing ${amount} ETH into ${multisigAddress}\n`);
    try {
        await node.call(types_1.Node.MethodName.DEPOSIT, {
            type: types_1.Node.MethodName.DEPOSIT,
            requestId: uuid_1.v4(),
            params: {
                multisigAddress,
                amount: utils_1.parseEther(amount),
                notifyCounterparty: true
            }
        });
        const postDepositBalances = await getFreeBalance(node, multisigAddress);
        if (!postDepositBalances[myFreeBalanceAddress].gt(preDepositBalances[myFreeBalanceAddress])) {
            throw Error("My balance was not increased.");
        }
        console.info("Waiting for counter party to deposit same amount");
        const freeBalanceNotUpdated = async () => {
            return !(await getFreeBalance(node, multisigAddress))[counterpartyFreeBalanceAddress].gt(preDepositBalances[counterpartyFreeBalanceAddress]);
        };
        while (await freeBalanceNotUpdated()) {
            console.info(`Waiting ${DELAY_SECONDS} more seconds for counter party deposit`);
            await delay(DELAY_SECONDS * 1000);
        }
        logEthFreeBalance(await getFreeBalance(node, multisigAddress));
    }
    catch (e) {
        console.error(`Failed to deposit... ${e}`);
        throw e;
    }
}
exports.deposit = deposit;
function buildRegistrationSignaturePayload(data) {
    return [
        "PLAYGROUND ACCOUNT REGISTRATION",
        `Username: ${data.username}`,
        `E-mail: ${data.email}`,
        `Ethereum address: ${data.ethAddress}`,
        `Node address: ${data.nodeAddress}`
    ].join("\n");
}
exports.buildRegistrationSignaturePayload = buildRegistrationSignaturePayload;
function timeout(delay = API_TIMEOUT) {
    const handler = setTimeout(() => {
        throw new Error("Request timed out");
    }, delay);
    return {
        cancel() {
            clearTimeout(handler);
        }
    };
}
async function get(baseURL, endpoint, token) {
    const requestTimeout = timeout();
    const httpResponse = await node_fetch_1.default(`${baseURL}/api/${endpoint}`, {
        method: "GET",
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
    requestTimeout.cancel();
    let response;
    let retriesAvailable = 10;
    while (typeof response === "undefined") {
        try {
            response = (await httpResponse.json());
        }
        catch (e) {
            retriesAvailable -= 1;
            if (e.type === "invalid-json" && retriesAvailable >= 0) {
                console.log(`Call to ${baseURL}/api/${endpoint} returned invalid JSON. Retrying (attempt #${10 -
                    retriesAvailable}).`);
                await delay(3000);
            }
            else
                throw e;
        }
    }
    if (response.errors) {
        const error = response.errors[0];
        throw error;
    }
    return response;
}
async function post(baseURL, endpoint, data, token, authType = "Signature") {
    const body = JSON.stringify({
        data
    });
    const httpResponse = await node_fetch_1.default(`${baseURL}/api/${endpoint}`, {
        body,
        headers: Object.assign({ "Content-Type": "application/json; charset=utf-8" }, (token ? { Authorization: `${authType} ${token}` } : {})),
        method: "POST"
    });
    const response = await httpResponse.json();
    if (response.errors) {
        const error = response.errors[0];
        throw error;
    }
    return response;
}
async function afterUser(botName, node, botPublicIdentifer, multisigAddress) {
    console.log("Setting up bot's event handlers");
    await bot_1.connectNode(botName, node, botPublicIdentifer, multisigAddress);
}
exports.afterUser = afterUser;
async function createAccount(baseURL, user, signature) {
    try {
        const data = toAPIResource(user);
        const json = (await post(baseURL, "users", data, signature));
        const resource = json.data;
        const jsonMultisig = (await post(baseURL, "multisig-deploys", {
            type: "multisigDeploy",
            attributes: { ethAddress: user.ethAddress }
        }, signature));
        const resourceMultisig = jsonMultisig.data;
        resource.attributes.transactionHash = resourceMultisig.id;
        console.log(`Multisig deployment tx hash: ${resourceMultisig.id}`);
        return fromAPIResource(resource);
    }
    catch (e) {
        return Promise.reject(e);
    }
}
exports.createAccount = createAccount;
function fromAPIResource(resource) {
    return Object.assign({ id: resource.id }, resource.attributes);
}
function toAPIResource(model) {
    return Object.assign({}, (model["id"] ? { id: model["id"] } : {}), { attributes: Object.assign({}, Object.keys(model)
            .map(key => {
            return { [key]: model[key] };
        })
            .reduce((previous, current) => {
            return Object.assign({}, previous, current);
        }, {})) });
}
async function getUser(baseURL, token) {
    if (!token) {
        throw new Error("getUser(): token is required");
    }
    try {
        const json = (await get(baseURL, "users/me", token));
        const resource = json.data[0];
        return fromAPIResource(resource);
    }
    catch (e) {
        return Promise.reject(e);
    }
}
exports.getUser = getUser;
var ErrorCode;
(function (ErrorCode) {
    ErrorCode["SignatureRequired"] = "signature_required";
    ErrorCode["InvalidSignature"] = "invalid_signature";
    ErrorCode["AddressAlreadyRegistered"] = "address_already_registered";
    ErrorCode["AppRegistryNotAvailable"] = "app_registry_not_available";
    ErrorCode["UserAddressRequired"] = "user_address_required";
    ErrorCode["NoUsersAvailable"] = "no_users_available";
    ErrorCode["UnhandledError"] = "unhandled_error";
    ErrorCode["UserNotFound"] = "user_not_found";
    ErrorCode["TokenRequired"] = "token_required";
    ErrorCode["InvalidToken"] = "invalid_token";
    ErrorCode["UsernameAlreadyExists"] = "username_already_exists";
})(ErrorCode = exports.ErrorCode || (exports.ErrorCode = {}));
var HttpStatusCode;
(function (HttpStatusCode) {
    HttpStatusCode[HttpStatusCode["OK"] = 200] = "OK";
    HttpStatusCode[HttpStatusCode["Created"] = 201] = "Created";
    HttpStatusCode[HttpStatusCode["BadRequest"] = 400] = "BadRequest";
    HttpStatusCode[HttpStatusCode["Unauthorized"] = 401] = "Unauthorized";
    HttpStatusCode[HttpStatusCode["Forbidden"] = 403] = "Forbidden";
    HttpStatusCode[HttpStatusCode["InternalServerError"] = 500] = "InternalServerError";
})(HttpStatusCode = exports.HttpStatusCode || (exports.HttpStatusCode = {}));
//# sourceMappingURL=utils.js.map