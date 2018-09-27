import * as ethers from "ethers";

export const encode = ethers.utils.defaultAbiCoder.encode.bind(
  ethers.utils.defaultAbiCoder
);

export const decode = ethers.utils.defaultAbiCoder.decode.bind(
  ethers.utils.defaultAbiCoder
);

export const encodePacked = ethers.utils.solidityPack.bind(
  ethers.utils.defaultAbiCoder
);
