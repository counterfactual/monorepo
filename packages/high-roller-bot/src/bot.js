"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const types_1 = require("@counterfactual/types");
const utils_1 = require("ethers/utils");
const uuid_1 = require("uuid");
const utils_2 = require("./utils");
var HighRollerStage;
(function (HighRollerStage) {
    HighRollerStage[HighRollerStage["PRE_GAME"] = 0] = "PRE_GAME";
    HighRollerStage[HighRollerStage["COMMITTING_HASH"] = 1] = "COMMITTING_HASH";
    HighRollerStage[HighRollerStage["COMMITTING_NUM"] = 2] = "COMMITTING_NUM";
    HighRollerStage[HighRollerStage["REVEALING"] = 3] = "REVEALING";
    HighRollerStage[HighRollerStage["DONE"] = 4] = "DONE";
})(HighRollerStage || (HighRollerStage = {}));
function computeCommitHash(appSalt, chosenNumber) {
    return utils_1.solidityKeccak256(["bytes32", "uint256"], [appSalt, chosenNumber]);
}
function respond(node, nodeAddress, msg) {
    const data = msg.data;
    const { appInstanceId } = data;
    const newState = data.newState;
    if (process.env.LOG_LEVEL && process.env.LOG_LEVEL === "DEBUG") {
        console.log("new state");
        console.log(newState);
    }
    if (newState.stage === HighRollerStage.COMMITTING_NUM) {
        const numToCommit = Math.floor(Math.random() * Math.floor(1000));
        const numberSalt = "0xdfdaa4d168f0be935a1e1d12b555995bc5ea67bd33fce1bc5be0a1e0a381fc90";
        const playerFirstNumber = Math.floor(Math.random() * Math.floor(1000));
        const hash = computeCommitHash(numberSalt, playerFirstNumber);
        const commitHashAction = {
            number: numToCommit,
            actionType: 2,
            actionHash: hash
        };
        const request = {
            params: {
                appInstanceId,
                action: commitHashAction
            },
            requestId: uuid_1.v4(),
            type: types_1.Node.MethodName.TAKE_ACTION
        };
        node.call(request.type, request);
    }
}
async function connectNode(botName, node, botPublicIdentifier, multisigAddress) {
    node.on(types_1.Node.EventName.PROPOSE_INSTALL_VIRTUAL, async (msg) => {
        const appInstanceId = msg.data.appInstanceId;
        const intermediaries = msg.data.params.intermediaries;
        const request = {
            type: types_1.Node.MethodName.INSTALL_VIRTUAL,
            params: {
                appInstanceId,
                intermediaries
            },
            requestId: uuid_1.v4()
        };
        try {
            await node.call(request.type, request);
            node.on(types_1.Node.EventName.UPDATE_STATE, async (updateEventData) => {
                if (updateEventData.data.appInstanceId === appInstanceId) {
                    respond(node, botPublicIdentifier, updateEventData);
                }
            });
        }
        catch (e) {
            console.error("Node call to install virtual app failed.");
            console.error(request);
            console.error(e);
        }
    });
    if (multisigAddress) {
        node.on(types_1.Node.EventName.UNINSTALL_VIRTUAL, async (uninstallMsg) => {
            console.info(`Uninstalled app`);
            console.info(uninstallMsg);
            utils_2.logEthFreeBalance(await utils_2.getFreeBalance(node, multisigAddress));
        });
    }
    console.info(`Bot ${botName} is ready to serve`);
}
exports.connectNode = connectNode;
//# sourceMappingURL=bot.js.map