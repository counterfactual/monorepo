this.window = this.window || {};
this.window.cf = (function (exports, utils$1) {
	'use strict';

	function unwrapExports (x) {
		return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
	}

	function createCommonjsModule(fn, module) {
		return module = { exports: {} }, fn(module, module.exports), module.exports;
	}

	var eventemitter3 = createCommonjsModule(function (module) {

	var has = Object.prototype.hasOwnProperty
	  , prefix = '~';

	/**
	 * Constructor to create a storage for our `EE` objects.
	 * An `Events` instance is a plain object whose properties are event names.
	 *
	 * @constructor
	 * @private
	 */
	function Events() {}

	//
	// We try to not inherit from `Object.prototype`. In some engines creating an
	// instance in this way is faster than calling `Object.create(null)` directly.
	// If `Object.create(null)` is not supported we prefix the event names with a
	// character to make sure that the built-in object properties are not
	// overridden or used as an attack vector.
	//
	if (Object.create) {
	  Events.prototype = Object.create(null);

	  //
	  // This hack is needed because the `__proto__` property is still inherited in
	  // some old browsers like Android 4, iPhone 5.1, Opera 11 and Safari 5.
	  //
	  if (!new Events().__proto__) prefix = false;
	}

	/**
	 * Representation of a single event listener.
	 *
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} [once=false] Specify if the listener is a one-time listener.
	 * @constructor
	 * @private
	 */
	function EE(fn, context, once) {
	  this.fn = fn;
	  this.context = context;
	  this.once = once || false;
	}

	/**
	 * Add a listener for a given event.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} context The context to invoke the listener with.
	 * @param {Boolean} once Specify if the listener is a one-time listener.
	 * @returns {EventEmitter}
	 * @private
	 */
	function addListener(emitter, event, fn, context, once) {
	  if (typeof fn !== 'function') {
	    throw new TypeError('The listener must be a function');
	  }

	  var listener = new EE(fn, context || emitter, once)
	    , evt = prefix ? prefix + event : event;

	  if (!emitter._events[evt]) emitter._events[evt] = listener, emitter._eventsCount++;
	  else if (!emitter._events[evt].fn) emitter._events[evt].push(listener);
	  else emitter._events[evt] = [emitter._events[evt], listener];

	  return emitter;
	}

	/**
	 * Clear event by name.
	 *
	 * @param {EventEmitter} emitter Reference to the `EventEmitter` instance.
	 * @param {(String|Symbol)} evt The Event name.
	 * @private
	 */
	function clearEvent(emitter, evt) {
	  if (--emitter._eventsCount === 0) emitter._events = new Events();
	  else delete emitter._events[evt];
	}

	/**
	 * Minimal `EventEmitter` interface that is molded against the Node.js
	 * `EventEmitter` interface.
	 *
	 * @constructor
	 * @public
	 */
	function EventEmitter() {
	  this._events = new Events();
	  this._eventsCount = 0;
	}

	/**
	 * Return an array listing the events for which the emitter has registered
	 * listeners.
	 *
	 * @returns {Array}
	 * @public
	 */
	EventEmitter.prototype.eventNames = function eventNames() {
	  var names = []
	    , events
	    , name;

	  if (this._eventsCount === 0) return names;

	  for (name in (events = this._events)) {
	    if (has.call(events, name)) names.push(prefix ? name.slice(1) : name);
	  }

	  if (Object.getOwnPropertySymbols) {
	    return names.concat(Object.getOwnPropertySymbols(events));
	  }

	  return names;
	};

	/**
	 * Return the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Array} The registered listeners.
	 * @public
	 */
	EventEmitter.prototype.listeners = function listeners(event) {
	  var evt = prefix ? prefix + event : event
	    , handlers = this._events[evt];

	  if (!handlers) return [];
	  if (handlers.fn) return [handlers.fn];

	  for (var i = 0, l = handlers.length, ee = new Array(l); i < l; i++) {
	    ee[i] = handlers[i].fn;
	  }

	  return ee;
	};

	/**
	 * Return the number of listeners listening to a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Number} The number of listeners.
	 * @public
	 */
	EventEmitter.prototype.listenerCount = function listenerCount(event) {
	  var evt = prefix ? prefix + event : event
	    , listeners = this._events[evt];

	  if (!listeners) return 0;
	  if (listeners.fn) return 1;
	  return listeners.length;
	};

	/**
	 * Calls each of the listeners registered for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @returns {Boolean} `true` if the event had listeners, else `false`.
	 * @public
	 */
	EventEmitter.prototype.emit = function emit(event, a1, a2, a3, a4, a5) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return false;

	  var listeners = this._events[evt]
	    , len = arguments.length
	    , args
	    , i;

	  if (listeners.fn) {
	    if (listeners.once) this.removeListener(event, listeners.fn, undefined, true);

	    switch (len) {
	      case 1: return listeners.fn.call(listeners.context), true;
	      case 2: return listeners.fn.call(listeners.context, a1), true;
	      case 3: return listeners.fn.call(listeners.context, a1, a2), true;
	      case 4: return listeners.fn.call(listeners.context, a1, a2, a3), true;
	      case 5: return listeners.fn.call(listeners.context, a1, a2, a3, a4), true;
	      case 6: return listeners.fn.call(listeners.context, a1, a2, a3, a4, a5), true;
	    }

	    for (i = 1, args = new Array(len -1); i < len; i++) {
	      args[i - 1] = arguments[i];
	    }

	    listeners.fn.apply(listeners.context, args);
	  } else {
	    var length = listeners.length
	      , j;

	    for (i = 0; i < length; i++) {
	      if (listeners[i].once) this.removeListener(event, listeners[i].fn, undefined, true);

	      switch (len) {
	        case 1: listeners[i].fn.call(listeners[i].context); break;
	        case 2: listeners[i].fn.call(listeners[i].context, a1); break;
	        case 3: listeners[i].fn.call(listeners[i].context, a1, a2); break;
	        case 4: listeners[i].fn.call(listeners[i].context, a1, a2, a3); break;
	        default:
	          if (!args) for (j = 1, args = new Array(len -1); j < len; j++) {
	            args[j - 1] = arguments[j];
	          }

	          listeners[i].fn.apply(listeners[i].context, args);
	      }
	    }
	  }

	  return true;
	};

	/**
	 * Add a listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.on = function on(event, fn, context) {
	  return addListener(this, event, fn, context, false);
	};

	/**
	 * Add a one-time listener for a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn The listener function.
	 * @param {*} [context=this] The context to invoke the listener with.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.once = function once(event, fn, context) {
	  return addListener(this, event, fn, context, true);
	};

	/**
	 * Remove the listeners of a given event.
	 *
	 * @param {(String|Symbol)} event The event name.
	 * @param {Function} fn Only remove the listeners that match this function.
	 * @param {*} context Only remove the listeners that have this context.
	 * @param {Boolean} once Only remove one-time listeners.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeListener = function removeListener(event, fn, context, once) {
	  var evt = prefix ? prefix + event : event;

	  if (!this._events[evt]) return this;
	  if (!fn) {
	    clearEvent(this, evt);
	    return this;
	  }

	  var listeners = this._events[evt];

	  if (listeners.fn) {
	    if (
	      listeners.fn === fn &&
	      (!once || listeners.once) &&
	      (!context || listeners.context === context)
	    ) {
	      clearEvent(this, evt);
	    }
	  } else {
	    for (var i = 0, events = [], length = listeners.length; i < length; i++) {
	      if (
	        listeners[i].fn !== fn ||
	        (once && !listeners[i].once) ||
	        (context && listeners[i].context !== context)
	      ) {
	        events.push(listeners[i]);
	      }
	    }

	    //
	    // Reset the array, or remove it completely if we have no more listeners.
	    //
	    if (events.length) this._events[evt] = events.length === 1 ? events[0] : events;
	    else clearEvent(this, evt);
	  }

	  return this;
	};

	/**
	 * Remove all listeners, or those of the specified event.
	 *
	 * @param {(String|Symbol)} [event] The event name.
	 * @returns {EventEmitter} `this`.
	 * @public
	 */
	EventEmitter.prototype.removeAllListeners = function removeAllListeners(event) {
	  var evt;

	  if (event) {
	    evt = prefix ? prefix + event : event;
	    if (this._events[evt]) clearEvent(this, evt);
	  } else {
	    this._events = new Events();
	    this._eventsCount = 0;
	  }

	  return this;
	};

	//
	// Alias methods names because people roll like that.
	//
	EventEmitter.prototype.off = EventEmitter.prototype.removeListener;
	EventEmitter.prototype.addListener = EventEmitter.prototype.on;

	//
	// Expose the prefix.
	//
	EventEmitter.prefixed = prefix;

	//
	// Allow `EventEmitter` to be imported as module namespace.
	//
	EventEmitter.EventEmitter = EventEmitter;

	//
	// Expose the module.
	//
	{
	  module.exports = EventEmitter;
	}
	});

	class NodeProvider {
	    constructor() {
	        this.debugMode = "none";
	        this.debugEmitter = _ => { };
	        this.isConnected = false;
	        this.eventEmitter = new eventemitter3();
	        this.detectDebugMode();
	    }
	    detectDebugMode() {
	        try {
	            if (process && process.env.CF_NODE_PROVIDER_DEBUG) {
	                this.debugMode = "shell";
	                this.debugEmitter = (source, message, data) => {
	                    console.log(`[NodeProvider] ${source}(): ${message}`);
	                    if (data) {
	                        console.log("   ", data);
	                    }
	                };
	            }
	        }
	        catch (_a) {
	            try {
	                if (window.localStorage.getItem("cf:node-provider:debug") === "true") {
	                    this.debugMode = "browser";
	                    this.debugEmitter = (source, message, data) => {
	                        console.log(["%c[NodeProvider]", `%c#${source}()`, `%c${message}`].join(" "), "color: gray;", "color: green;", "color: black;");
	                        if (data) {
	                            console.log("   ", data);
	                        }
	                    };
	                }
	            }
	            catch (_b) {
	                if (window.location.href.includes("#cf:node-provider:debug")) {
	                    this.debugMode = "browser";
	                    this.debugEmitter = (source, message, data) => {
	                        console.log(["%c[NodeProvider]", `%c#${source}()`, `%c${message}`].join(" "), "color: gray;", "color: green;", "color: black;");
	                        if (data) {
	                            console.log("   ", data);
	                        }
	                    };
	                }
	            }
	        }
	    }
	    log(source, message, data) {
	        if (this.debugMode === "none") {
	            return;
	        }
	        this.debugEmitter(source, message, data);
	    }
	    onMessage(callback) {
	        this.log("onMessage", "Registered listener for eventEmitter#message", callback.toString());
	        this.eventEmitter.on("message", callback);
	    }
	    sendMessage(message) {
	        if (!this.isConnected || !this.messagePort) {
	            throw new Error("It's not possible to use postMessage() before the NodeProvider is connected. Call the connect() method first.");
	        }
	        this.messagePort.postMessage(message);
	        this.log("sendMessage", "Message has been posted via messagePort", JSON.stringify(message));
	    }
	    async connect() {
	        if (this.isConnected) {
	            console.warn("NodeProvider is already connected.");
	            return Promise.resolve(this);
	        }
	        const context = window.parent || window;
	        this.log("connect", "Attempting to connect");
	        return new Promise((resolve, reject) => {
	            window.addEventListener("message", event => {
	                if (event.data === "cf-node-provider:port") {
	                    this.log("connect", "Received message via window.onMessage event", "cf-node-provider-port");
	                    this.startMessagePort(event);
	                    this.notifyNodeProviderIsConnected();
	                    resolve(this);
	                }
	            });
	            context.postMessage("cf-node-provider:init", "*");
	            this.log("connect", "used window.postMessage() to send", "cf-node-provider:init");
	        });
	    }
	    startMessagePort(event) {
	        this.messagePort = event.ports[0];
	        this.messagePort.addEventListener("message", event => {
	            this.log("messagePort#onMessage", "messagePort has received a message", event.data);
	            this.eventEmitter.emit("message", event.data);
	        });
	        this.messagePort.start();
	        this.log("startMessagePort", "messagePort has started");
	    }
	    notifyNodeProviderIsConnected() {
	        window.postMessage("cf-node-provider:ready", "*");
	        this.log("notifyNodeProviderIsConnected", "used window.postMessage() to send:", "cf-node-provider:ready");
	        this.isConnected = true;
	        this.log("notifyNodeProviderIsConnected", "Connection successful");
	    }
	}

	var OutcomeType;
	(function (OutcomeType) {
	    OutcomeType[OutcomeType["TWO_PARTY_FIXED_OUTCOME"] = 0] = "TWO_PARTY_FIXED_OUTCOME";
	    OutcomeType[OutcomeType["COIN_TRANSFER"] = 1] = "COIN_TRANSFER";
	})(OutcomeType || (OutcomeType = {}));
	var TwoPartyFixedOutcome;
	(function (TwoPartyFixedOutcome) {
	    TwoPartyFixedOutcome[TwoPartyFixedOutcome["SEND_TO_ADDR_ONE"] = 0] = "SEND_TO_ADDR_ONE";
	    TwoPartyFixedOutcome[TwoPartyFixedOutcome["SEND_TO_ADDR_TWO"] = 1] = "SEND_TO_ADDR_TWO";
	    TwoPartyFixedOutcome[TwoPartyFixedOutcome["SPLIT_AND_SEND_TO_BOTH_ADDRS"] = 2] = "SPLIT_AND_SEND_TO_BOTH_ADDRS";
	})(TwoPartyFixedOutcome || (TwoPartyFixedOutcome = {}));

	var Node;
	(function (Node) {
	    let ErrorType;
	    (function (ErrorType) {
	        ErrorType["ERROR"] = "error";
	    })(ErrorType = Node.ErrorType || (Node.ErrorType = {}));
	    let MethodName;
	    (function (MethodName) {
	        MethodName["ACCEPT_STATE"] = "acceptState";
	        MethodName["CREATE_CHANNEL"] = "createChannel";
	        MethodName["DEPOSIT"] = "deposit";
	        MethodName["GET_APP_INSTANCE_DETAILS"] = "getAppInstanceDetails";
	        MethodName["GET_APP_INSTANCES"] = "getAppInstances";
	        MethodName["GET_CHANNEL_ADDRESSES"] = "getChannelAddresses";
	        MethodName["GET_STATE_DEPOSIT_HOLDER_ADDRESS"] = "getStateDepositHolderAddress";
	        MethodName["GET_FREE_BALANCE_STATE"] = "getFreeBalanceState";
	        MethodName["GET_PROPOSED_APP_INSTANCE"] = "getProposedAppInstance";
	        MethodName["GET_PROPOSED_APP_INSTANCES"] = "getProposedAppInstances";
	        MethodName["GET_STATE"] = "getState";
	        MethodName["GET_STATE_CHANNEL"] = "getStateChannel";
	        MethodName["INSTALL"] = "install";
	        MethodName["INSTALL_VIRTUAL"] = "installVirtual";
	        MethodName["PROPOSE_INSTALL"] = "proposeInstall";
	        MethodName["PROPOSE_INSTALL_VIRTUAL"] = "proposeInstallVirtual";
	        MethodName["PROPOSE_STATE"] = "proposeState";
	        MethodName["REJECT_INSTALL"] = "rejectInstall";
	        MethodName["REJECT_STATE"] = "rejectState";
	        MethodName["UPDATE_STATE"] = "updateState";
	        MethodName["TAKE_ACTION"] = "takeAction";
	        MethodName["UNINSTALL"] = "uninstall";
	        MethodName["UNINSTALL_VIRTUAL"] = "uninstallVirtual";
	        MethodName["WITHDRAW"] = "withdraw";
	    })(MethodName = Node.MethodName || (Node.MethodName = {}));
	    let RpcMethodName;
	    (function (RpcMethodName) {
	        RpcMethodName["CREATE_CHANNEL"] = "chan_create";
	        RpcMethodName["DEPOSIT"] = "chan_deposit";
	        RpcMethodName["GET_APP_INSTANCE_DETAILS"] = "chan_getAppInstance";
	        RpcMethodName["GET_APP_INSTANCES"] = "chan_getAppInstances";
	        RpcMethodName["GET_STATE_DEPOSIT_HOLDER_ADDRESS"] = "chan_getStateDepositHolderAddress";
	        RpcMethodName["GET_FREE_BALANCE_STATE"] = "chan_getFreeBalanceState";
	        RpcMethodName["GET_PROPOSED_APP_INSTANCES"] = "chan_getProposedAppInstances";
	        RpcMethodName["GET_STATE"] = "chan_getState";
	        RpcMethodName["INSTALL"] = "chan_install";
	        RpcMethodName["INSTALL_VIRTUAL"] = "chan_installVirtual";
	        RpcMethodName["PROPOSE_INSTALL"] = "chan_proposeInstall";
	        RpcMethodName["PROPOSE_INSTALL_VIRTUAL"] = "chan_proposeInstallVirtual";
	        RpcMethodName["PROPOSE_STATE"] = "chan_proposeState";
	        RpcMethodName["REJECT_INSTALL"] = "chan_rejectInstall";
	        RpcMethodName["REJECT_STATE"] = "chan_rejectState";
	        RpcMethodName["UPDATE_STATE"] = "chan_updateState";
	        RpcMethodName["TAKE_ACTION"] = "chan_takeAction";
	        RpcMethodName["UNINSTALL"] = "chan_uninstall";
	        RpcMethodName["UNINSTALL_VIRTUAL"] = "chan_uninstallVirtual";
	        RpcMethodName["WITHDRAW"] = "chan_withdraw";
	    })(RpcMethodName = Node.RpcMethodName || (Node.RpcMethodName = {}));
	    let EventName;
	    (function (EventName) {
	        EventName["COUNTER_DEPOSIT_CONFIRMED"] = "counterDepositConfirmed";
	        EventName["CREATE_CHANNEL"] = "createChannelEvent";
	        EventName["DEPOSIT_CONFIRMED"] = "depositConfirmedEvent";
	        EventName["DEPOSIT_FAILED"] = "depositFailed";
	        EventName["DEPOSIT_STARTED"] = "depositStartedEvent";
	        EventName["INSTALL"] = "installEvent";
	        EventName["INSTALL_VIRTUAL"] = "installVirtualEvent";
	        EventName["PROPOSE_STATE"] = "proposeStateEvent";
	        EventName["REJECT_INSTALL"] = "rejectInstallEvent";
	        EventName["REJECT_STATE"] = "rejectStateEvent";
	        EventName["UNINSTALL"] = "uninstallEvent";
	        EventName["UNINSTALL_VIRTUAL"] = "uninstallVirtualEvent";
	        EventName["UPDATE_STATE"] = "updateStateEvent";
	        EventName["WITHDRAWAL_CONFIRMED"] = "withdrawalConfirmedEvent";
	        EventName["WITHDRAWAL_FAILED"] = "withdrawalFailed";
	        EventName["WITHDRAWAL_STARTED"] = "withdrawalStartedEvent";
	        EventName["PROPOSE_INSTALL"] = "proposeInstallEvent";
	        EventName["PROPOSE_INSTALL_VIRTUAL"] = "proposeInstallVirtualEvent";
	        EventName["PROTOCOL_MESSAGE_EVENT"] = "protocolMessageEvent";
	        EventName["WITHDRAW_EVENT"] = "withdrawEvent";
	        EventName["REJECT_INSTALL_VIRTUAL"] = "rejectInstallVirtualEvent";
	    })(EventName = Node.EventName || (Node.EventName = {}));
	})(Node || (Node = {}));

	var EventType;
	(function (EventType) {
	    EventType["INSTALL"] = "install";
	    EventType["INSTALL_VIRTUAL"] = "installVirtual";
	    EventType["REJECT_INSTALL"] = "rejectInstall";
	    EventType["UNINSTALL"] = "uninstall";
	    EventType["UPDATE_STATE"] = "updateState";
	    EventType["CREATE_MULTISIG"] = "createMultisig";
	    EventType["ERROR"] = "error";
	})(EventType || (EventType = {}));



	var types = /*#__PURE__*/Object.freeze({
		get EventType () { return EventType; }
	});

	function parseBigNumber(val, paramName) {
	    try {
	        return new utils$1.BigNumber(val);
	    }
	    catch (e) {
	        throw {
	            type: EventType.ERROR,
	            data: {
	                errorName: "invalid_param",
	                message: `Invalid value for parameter '${paramName}': ${val}`,
	                extra: {
	                    paramName,
	                    originalError: e
	                }
	            }
	        };
	    }
	}
	class AppFactory {
	    constructor(appDefinition, encodings, provider) {
	        this.appDefinition = appDefinition;
	        this.encodings = encodings;
	        this.provider = provider;
	    }
	    async proposeInstall(params) {
	        const timeout = parseBigNumber(params.timeout, "timeout");
	        const initiatorDeposit = parseBigNumber(params.initiatorDeposit, "initiatorDeposit");
	        const responderDeposit = parseBigNumber(params.responderDeposit, "responderDeposit");
	        const response = await this.provider.callRawNodeMethod(Node.RpcMethodName.PROPOSE_INSTALL, {
	            timeout,
	            responderDeposit,
	            initiatorDeposit,
	            proposedToIdentifier: params.proposedToIdentifier,
	            initialState: params.initialState,
	            appDefinition: this.appDefinition,
	            abiEncodings: this.encodings,
	            outcomeType: params.outcomeType
	        });
	        const { appInstanceId } = response.result;
	        return appInstanceId;
	    }
	    async proposeInstallVirtual(params) {
	        const timeout = parseBigNumber(params.timeout, "timeout");
	        const initiatorDeposit = parseBigNumber(params.initiatorDeposit, "initiatorDeposit");
	        const responderDeposit = parseBigNumber(params.responderDeposit, "responderDeposit");
	        const response = await this.provider.callRawNodeMethod(Node.RpcMethodName.PROPOSE_INSTALL_VIRTUAL, {
	            timeout,
	            responderDeposit,
	            initiatorDeposit,
	            proposedToIdentifier: params.proposedToIdentifier,
	            initialState: params.initialState,
	            intermediaries: params.intermediaries,
	            appDefinition: this.appDefinition,
	            abiEncodings: this.encodings,
	            outcomeType: OutcomeType.TWO_PARTY_FIXED_OUTCOME
	        });
	        const { appInstanceId } = response.result;
	        return appInstanceId;
	    }
	}

	var controller = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	class Controller {
	}
	Controller.rpcMethods = {};
	exports.default = Controller;

	});

	unwrapExports(controller);

	var router = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });

	class Router {
	    constructor({ controllers }) {
	        this.controllers = controllers;
	    }
	    async dispatch(rpc) {
	        const controller$1 = Object.values(controller.default.rpcMethods).find(mapping => mapping.method === rpc.methodName);
	        if (!controller$1) {
	            console.warn(`Cannot execute ${rpc.methodName}: no controller`);
	            return;
	        }
	        return new controller$1.type()[controller$1.callback](rpc.parameters);
	    }
	}
	exports.default = Router;

	});

	unwrapExports(router);

	var jsonapi = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	function jsonApiType(name) {
	    return (target) => {
	        target.jsonapiType = name;
	        const functions = Object.getOwnPropertyNames(target.prototype).filter(key => key !== "constructor");
	        // Type overriden operations.
	        functions
	            .filter(func => Object.values(target.rpcMethods).find(method => method.callback === func))
	            .forEach(method => {
	            const descriptor = Object.entries(target.rpcMethods).find(([, mapping]) => mapping.callback === method && mapping.method.includes("[type]"));
	            if (!descriptor) {
	                return;
	            }
	            const [key, originalMapping] = descriptor;
	            target.rpcMethods[key] = {
	                ...target.rpcMethods[key],
	                method: originalMapping.method.replace("[type]", target.jsonapiType)
	            };
	        });
	        // Map new functions.
	        functions
	            .filter(func => !Object.values(target.rpcMethods).find(method => method.callback === func))
	            .forEach(method => {
	            jsonApiOperation(method, target)(target.prototype, method);
	        });
	    };
	}
	exports.jsonApiType = jsonApiType;
	function jsonApiOperation(name, forcedConstructor) {
	    return (target, propertyKey) => {
	        const constructor = forcedConstructor || target.constructor;
	        const key = `${target.constructor.name}:${name}`;
	        constructor.rpcMethods[key] = {
	            method: `${constructor.jsonapiType || "[type]"}:${name}`,
	            callback: propertyKey,
	            type: constructor
	        };
	    };
	}
	exports.jsonApiOperation = jsonApiOperation;
	function jsonApiDeserialize(payload) {
	    return {
	        methodName: `${payload.ref.type}:${payload.op}`,
	        parameters: payload
	    };
	}
	exports.jsonApiDeserialize = jsonApiDeserialize;

	});

	unwrapExports(jsonapi);
	var jsonapi_1 = jsonapi.jsonApiType;
	var jsonapi_2 = jsonapi.jsonApiOperation;
	var jsonapi_3 = jsonapi.jsonApiDeserialize;

	var jsonrpc = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });
	function jsonRpcMethod(name) {
	    return (target, propertyKey) => {
	        const constructor = target.constructor;
	        constructor.rpcMethods[`${constructor.name}:${name}`] = {
	            method: name,
	            callback: propertyKey,
	            type: constructor
	        };
	    };
	}
	exports.jsonRpcMethod = jsonRpcMethod;
	function jsonRpcDeserialize(payload) {
	    return {
	        methodName: payload.method,
	        parameters: payload.params,
	        id: payload.id
	    };
	}
	exports.jsonRpcDeserialize = jsonRpcDeserialize;
	function jsonRpcSerializeAsResponse(result, id) {
	    return {
	        jsonrpc: "2.0",
	        result,
	        id
	    };
	}
	exports.jsonRpcSerializeAsResponse = jsonRpcSerializeAsResponse;
	function jsonRpcSerializeAsNotification(result) {
	    return {
	        jsonrpc: "2.0",
	        result
	    };
	}
	exports.jsonRpcSerializeAsNotification = jsonRpcSerializeAsNotification;

	});

	unwrapExports(jsonrpc);
	var jsonrpc_1 = jsonrpc.jsonRpcMethod;
	var jsonrpc_2 = jsonrpc.jsonRpcDeserialize;
	var jsonrpc_3 = jsonrpc.jsonRpcSerializeAsResponse;
	var jsonrpc_4 = jsonrpc.jsonRpcSerializeAsNotification;

	var dist = createCommonjsModule(function (module, exports) {
	Object.defineProperty(exports, "__esModule", { value: true });

	exports.Controller = controller.default;

	exports.Router = router.default;

	exports.jsonApiType = jsonapi.jsonApiType;
	exports.jsonApiOperation = jsonapi.jsonApiOperation;
	exports.jsonApiDeserialize = jsonapi.jsonApiDeserialize;

	exports.jsonRpcDeserialize = jsonrpc.jsonRpcDeserialize;
	exports.jsonRpcMethod = jsonrpc.jsonRpcMethod;
	exports.jsonRpcSerializeAsNotification = jsonrpc.jsonRpcSerializeAsNotification;
	exports.jsonRpcSerializeAsResponse = jsonrpc.jsonRpcSerializeAsResponse;

	});

	unwrapExports(dist);
	var dist_1 = dist.Controller;
	var dist_2 = dist.Router;
	var dist_3 = dist.jsonApiType;
	var dist_4 = dist.jsonApiOperation;
	var dist_5 = dist.jsonApiDeserialize;
	var dist_6 = dist.jsonRpcDeserialize;
	var dist_7 = dist.jsonRpcMethod;
	var dist_8 = dist.jsonRpcSerializeAsNotification;
	var dist_9 = dist.jsonRpcSerializeAsResponse;

	var AppInstanceEventType;
	(function (AppInstanceEventType) {
	    AppInstanceEventType["UPDATE_STATE"] = "updateState";
	    AppInstanceEventType["UNINSTALL"] = "uninstall";
	    AppInstanceEventType["ERROR"] = "error";
	})(AppInstanceEventType || (AppInstanceEventType = {}));
	class AppInstance {
	    constructor(info, provider) {
	        this.provider = provider;
	        this.eventEmitter = new eventemitter3();
	        this.validEventTypes = Object.keys(AppInstanceEventType).map(key => AppInstanceEventType[key]);
	        this.identityHash = info.identityHash;
	        if (info["appInterface"] !== undefined) {
	            this.appDefinition = info["appInterface"].addr;
	            this.abiEncodings = {
	                stateEncoding: info["appInterface"].stateEncoding,
	                actionEncoding: info["appInterface"].actionEncoding
	            };
	            this.timeout = info["defaultTimeout"];
	        }
	        else {
	            this.appDefinition = info["appDefinition"];
	            this.abiEncodings = info["abiEncodings"];
	            this.timeout = info["timeout"];
	        }
	        this.initiatorDeposit = info["initiatorDeposit"];
	        this.responderDeposit = info["responderDeposit"];
	        this.intermediaries = info["intermediaries"];
	    }
	    get isVirtual() {
	        return !!(this.intermediaries && this.intermediaries.length !== 0);
	    }
	    async getState() {
	        const response = await this.provider.callRawNodeMethod(Node.RpcMethodName.GET_STATE, {
	            appInstanceId: this.identityHash
	        });
	        const result = response.result;
	        return result.state;
	    }
	    async takeAction(action) {
	        const response = await this.provider.callRawNodeMethod(Node.RpcMethodName.TAKE_ACTION, {
	            action,
	            appInstanceId: this.identityHash
	        });
	        const result = response.result;
	        return result.newState;
	    }
	    async uninstall() {
	        const intermediaryIdentifier = this.intermediaries
	            ? this.intermediaries[0]
	            : undefined;
	        await this.provider.callRawNodeMethod(intermediaryIdentifier
	            ? Node.RpcMethodName.UNINSTALL_VIRTUAL
	            : Node.RpcMethodName.UNINSTALL, {
	            intermediaryIdentifier,
	            appInstanceId: this.identityHash
	        });
	    }
	    on(eventType, callback) {
	        this.validateEventType(eventType);
	        this.eventEmitter.on(eventType, callback);
	    }
	    once(eventType, callback) {
	        this.validateEventType(eventType);
	        this.eventEmitter.once(eventType, callback);
	    }
	    off(eventType, callback) {
	        this.validateEventType(eventType);
	        this.eventEmitter.off(eventType, callback);
	    }
	    validateEventType(eventType) {
	        if (!this.validEventTypes.includes(eventType)) {
	            throw new Error(`"${eventType}" is not a valid event`);
	        }
	    }
	    emit(eventType, event) {
	        this.eventEmitter.emit(eventType, event);
	    }
	}

	const jsonRpcMethodNames = {
	    [Node.MethodName.GET_APP_INSTANCE_DETAILS]: "chan_getAppInstance",
	    [Node.MethodName.GET_APP_INSTANCES]: "chan_getAppInstances",
	    [Node.MethodName.GET_PROPOSED_APP_INSTANCES]: "chan_getProposedAppInstances",
	    [Node.MethodName.GET_STATE]: "chan_getState",
	    [Node.MethodName.INSTALL]: "chan_install",
	    [Node.MethodName.INSTALL_VIRTUAL]: "chan_installVirtual",
	    [Node.MethodName.PROPOSE_INSTALL]: "chan_proposeInstall",
	    [Node.MethodName.PROPOSE_INSTALL_VIRTUAL]: "chan_proposeInstallVirtual",
	    [Node.MethodName.REJECT_INSTALL]: "chan_rejectInstall",
	    [Node.MethodName.TAKE_ACTION]: "chan_takeAction",
	    [Node.MethodName.UNINSTALL]: "chan_uninstall",
	    [Node.MethodName.UNINSTALL_VIRTUAL]: "uninstallVirtual"
	};
	const NODE_REQUEST_TIMEOUT = 20000;
	class Provider {
	    constructor(nodeProvider) {
	        this.nodeProvider = nodeProvider;
	        this.requestListeners = {};
	        this.eventEmitter = new eventemitter3();
	        this.appInstances = {};
	        this.nodeProvider.onMessage(this.onNodeMessage.bind(this));
	        this.setupAppInstanceEventListeners();
	    }
	    async getAppInstances() {
	        const response = await this.callRawNodeMethod(Node.RpcMethodName.GET_APP_INSTANCES, {});
	        const result = response.result;
	        return Promise.all(result.appInstances.map(info => this.getOrCreateAppInstance(info.identityHash, info)));
	    }
	    async install(appInstanceId) {
	        const response = await this.callRawNodeMethod(Node.RpcMethodName.INSTALL, {
	            appInstanceId
	        });
	        const { appInstance } = response.result;
	        return this.getOrCreateAppInstance(appInstanceId, appInstance);
	    }
	    async installVirtual(appInstanceId, intermediaries) {
	        const response = await this.callRawNodeMethod(Node.RpcMethodName.INSTALL_VIRTUAL, {
	            appInstanceId,
	            intermediaries
	        });
	        const { appInstance } = response.result;
	        return this.getOrCreateAppInstance(appInstanceId, appInstance);
	    }
	    async rejectInstall(appInstanceId) {
	        await this.callRawNodeMethod(Node.RpcMethodName.REJECT_INSTALL, {
	            appInstanceId
	        });
	    }
	    on(eventType, callback) {
	        this.validateEventType(eventType);
	        this.eventEmitter.on(eventType, callback);
	    }
	    once(eventType, callback) {
	        this.validateEventType(eventType);
	        this.eventEmitter.once(eventType, callback);
	    }
	    off(eventType, callback) {
	        this.validateEventType(eventType);
	        this.eventEmitter.off(eventType, callback);
	    }
	    async callRawNodeMethod(methodName, params) {
	        const requestId = new Date().valueOf();
	        return new Promise((resolve, reject) => {
	            const request = dist_6({
	                params,
	                jsonrpc: "2.0",
	                method: methodName,
	                id: requestId
	            });
	            if (!request.methodName) {
	                return this.handleNodeError({
	                    jsonrpc: "2.0",
	                    result: {
	                        type: EventType.ERROR,
	                        data: {
	                            errorName: "unexpected_event_type"
	                        }
	                    },
	                    id: requestId
	                });
	            }
	            this.requestListeners[requestId] = response => {
	                if (response.result.type === Node.ErrorType.ERROR) {
	                    return reject(dist_9(Object.assign({}, response.result, { type: EventType.ERROR }), requestId));
	                }
	                if (response.result.type !== methodName) {
	                    return reject(dist_9({
	                        type: EventType.ERROR,
	                        data: {
	                            errorName: "unexpected_message_type",
	                            message: `Unexpected response type. Expected ${methodName}, got ${response.result.type}`
	                        }
	                    }, requestId));
	                }
	                resolve(response.result);
	            };
	            setTimeout(() => {
	                if (this.requestListeners[requestId] !== undefined) {
	                    reject({
	                        type: EventType.ERROR,
	                        data: {
	                            errorName: "request_timeout",
	                            message: `Request timed out: ${JSON.stringify(request)}`
	                        }
	                    });
	                    delete this.requestListeners[requestId];
	                }
	            }, NODE_REQUEST_TIMEOUT);
	            this.nodeProvider.sendMessage(request);
	        });
	    }
	    async getOrCreateAppInstance(id, info) {
	        if (!(id in this.appInstances)) {
	            let newInfo;
	            if (info) {
	                newInfo = info;
	            }
	            else {
	                const { result } = await this.callRawNodeMethod(Node.RpcMethodName.GET_APP_INSTANCE_DETAILS, { appInstanceId: id });
	                newInfo = result.appInstance;
	            }
	            this.appInstances[id] = new AppInstance(newInfo, this);
	        }
	        return this.appInstances[id];
	    }
	    validateEventType(eventType) {
	    }
	    onNodeMessage(message) {
	        const type = message["jsonrpc"]
	            ? message.result.type
	            : message.type;
	        if (Object.values(Node.ErrorType).indexOf(type) !== -1) {
	            this.handleNodeError(message);
	        }
	        else if ("id" in message) {
	            this.handleNodeMethodResponse(message);
	        }
	        else {
	            this.handleNodeEvent(message);
	        }
	    }
	    handleNodeError(error) {
	        const requestId = error.id;
	        if (requestId && this.requestListeners[requestId]) {
	            this.requestListeners[requestId](error);
	            delete this.requestListeners[requestId];
	        }
	        this.eventEmitter.emit(error.result.type, error.result);
	    }
	    handleNodeMethodResponse(response) {
	        const { id } = response;
	        if (id in this.requestListeners) {
	            this.requestListeners[id](response);
	            delete this.requestListeners[id];
	        }
	        else {
	            const error = dist_9({
	                type: EventType.ERROR,
	                data: {
	                    errorName: "orphaned_response",
	                    message: `Response has no corresponding inflight request: ${JSON.stringify(response)}`
	                }
	            }, Number(id));
	            this.eventEmitter.emit(error.result.type, error.result);
	        }
	    }
	    async handleNodeEvent(event) {
	        const nodeEvent = event["jsonrpc"]
	            ? event.result
	            : event;
	        switch (nodeEvent.type) {
	            case Node.EventName.REJECT_INSTALL:
	                return this.handleRejectInstallEvent(nodeEvent);
	            case Node.EventName.UPDATE_STATE:
	                return this.handleUpdateStateEvent(nodeEvent);
	            case Node.EventName.UNINSTALL:
	                return this.handleUninstallEvent(nodeEvent);
	            case Node.EventName.INSTALL:
	                return this.handleInstallEvent(nodeEvent);
	            case Node.EventName.INSTALL_VIRTUAL:
	                return this.handleInstallVirtualEvent(nodeEvent);
	            default:
	                return this.handleUnexpectedEvent(nodeEvent);
	        }
	    }
	    handleUnexpectedEvent(nodeEvent) {
	        const event = {
	            type: EventType.ERROR,
	            data: {
	                errorName: "unexpected_event_type",
	                message: `Unexpected event type: ${nodeEvent.type}: ${JSON.stringify(nodeEvent)}`
	            }
	        };
	        return this.eventEmitter.emit(event.type, event);
	    }
	    async handleInstallEvent(nodeEvent) {
	        const { appInstanceId } = nodeEvent.data;
	        const appInstance = await this.getOrCreateAppInstance(appInstanceId);
	        const event = {
	            type: EventType.INSTALL,
	            data: {
	                appInstance
	            }
	        };
	        return this.eventEmitter.emit(event.type, event);
	    }
	    async handleInstallVirtualEvent(nodeEvent) {
	        const { appInstanceId } = nodeEvent.data["params"];
	        const appInstance = await this.getOrCreateAppInstance(appInstanceId);
	        const event = {
	            type: EventType.INSTALL_VIRTUAL,
	            data: {
	                appInstance
	            }
	        };
	        return this.eventEmitter.emit(event.type, event);
	    }
	    async handleUninstallEvent(nodeEvent) {
	        const { appInstanceId } = nodeEvent.data;
	        const appInstance = await this.getOrCreateAppInstance(appInstanceId);
	        const event = {
	            type: EventType.UNINSTALL,
	            data: {
	                appInstance
	            }
	        };
	        return this.eventEmitter.emit(event.type, event);
	    }
	    async handleUpdateStateEvent(nodeEvent) {
	        const { appInstanceId, action, newState } = nodeEvent.data;
	        const appInstance = await this.getOrCreateAppInstance(appInstanceId);
	        const event = {
	            type: EventType.UPDATE_STATE,
	            data: {
	                appInstance,
	                newState,
	                action
	            }
	        };
	        return this.eventEmitter.emit(event.type, event);
	    }
	    async handleRejectInstallEvent(nodeEvent) {
	        const data = nodeEvent.data;
	        const info = data.appInstance;
	        const appInstance = await this.getOrCreateAppInstance(info.identityHash, info);
	        const event = {
	            type: EventType.REJECT_INSTALL,
	            data: {
	                appInstance
	            }
	        };
	        return this.eventEmitter.emit(event.type, event);
	    }
	    setupAppInstanceEventListeners() {
	        this.on(EventType.UPDATE_STATE, event => {
	            const { appInstance } = event.data;
	            appInstance.emit(AppInstanceEventType.UPDATE_STATE, event);
	        });
	        this.on(EventType.UNINSTALL, event => {
	            const { appInstance } = event.data;
	            appInstance.emit(AppInstanceEventType.UNINSTALL, event);
	        });
	        this.on(EventType.ERROR, async (event) => {
	            const { appInstanceId } = event.data;
	            if (appInstanceId) {
	                const instance = await this.getOrCreateAppInstance(appInstanceId);
	                instance.emit(AppInstanceEventType.ERROR, event);
	            }
	        });
	    }
	}

	function encode(types, values) {
	    return utils$1.defaultAbiCoder.encode(types, values);
	}
	function decode(types, data) {
	    return utils$1.defaultAbiCoder.decode(types, data);
	}
	function encodePacked(types, values) {
	    return utils$1.solidityPack(types, values);
	}

	var abi = /*#__PURE__*/Object.freeze({
		encode: encode,
		decode: decode,
		encodePacked: encodePacked
	});

	function signaturesToBytes(...signatures) {
	    return signatures
	        .map(utils$1.joinSignature)
	        .map(s => s.substr(2))
	        .reduce((acc, v) => acc + v, "0x");
	}
	function sortSignaturesBySignerAddress(digest, signatures) {
	    const ret = signatures.slice();
	    ret.sort((sigA, sigB) => {
	        const addrA = utils$1.recoverAddress(digest, signaturesToBytes(sigA));
	        const addrB = utils$1.recoverAddress(digest, signaturesToBytes(sigB));
	        return new utils$1.BigNumber(addrA).lt(addrB) ? -1 : 1;
	    });
	    return ret;
	}
	function signaturesToBytesSortedBySignerAddress(digest, ...signatures) {
	    return signaturesToBytes(...sortSignaturesBySignerAddress(digest, signatures));
	}



	var utils = /*#__PURE__*/Object.freeze({
		abi: abi,
		signaturesToBytes: signaturesToBytes,
		sortSignaturesBySignerAddress: sortSignaturesBySignerAddress,
		signaturesToBytesSortedBySignerAddress: signaturesToBytesSortedBySignerAddress
	});

	const cf = {
	    AppFactory,
	    Provider,
	    types,
	    utils
	};

	exports.AppFactory = AppFactory;
	exports.NodeProvider = NodeProvider;
	exports.Provider = Provider;
	exports.default = cf;
	exports.types = types;
	exports.utils = utils;

	return exports;

}({}, ethers.utils));
