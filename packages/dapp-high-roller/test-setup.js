global.XMLHttpRequest = {
  open: () => {},
  send: () => {}
};
global.uuid = require("../../node_modules/uuid/v4");
global.types = require("../types/dist/index-iife");
global.ethers = require("../../node_modules/ethers/dist/ethers");
global.EventEmitter3 = require("../node-provider/node_modules/eventemitter3/umd/eventemitter3");
global.EventEmitter = global.EventEmitter3.EventEmitter;
global.cf = require("../cf.js/dist/index-iife");

global.window = { location: {} };
