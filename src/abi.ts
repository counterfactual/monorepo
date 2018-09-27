import * as ethers from "ethers";

export const encode = ethers.utils.defaultAbiCoder.encode;

export const decode = ethers.utils.defaultAbiCoder.decode;

export const encodePacked = ethers.utils.solidityPack;
