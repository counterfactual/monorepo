import { keccak256 } from "ethers/utils/solidity";

export function virtualAppKey(
    users: string[],
    intermediary: string
) {
    if (users.length !== 2) {
        throw Error("virtualAppKey can only calculate with 2 users")
    }
    return keccak256(
        ["address", "address", "address"],
        [intermediary, users[0], users[1]]
    );
}