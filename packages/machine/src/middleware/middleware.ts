import * as cf from "@counterfactual/cf.js";

import { Instruction } from "../instructions";
import { Context, State } from "../state";
import {
  InstructionMiddlewareCallback,
  InstructionMiddlewares,
  InternalMessage,
  OpCodeResult
} from "../types";

import { StateTransition } from "./state-transition/state-transition";

/**
 * Middleware is the container holding the groups of middleware responsible
 * for executing a given instruction in the Counterfactual InstructionExecutor.
 */
export class Middleware {
  /**
   * Maps instruction to list of middleware that will process the instruction.
   */
  public middlewares: InstructionMiddlewares = {
    [Instruction.ALL]: [],
    [Instruction.IO_PREPARE_SEND]: [],
    [Instruction.IO_SEND]: [],
    [Instruction.IO_WAIT]: [],
    [Instruction.KEY_GENERATE]: [],
    [Instruction.OP_GENERATE]: [],
    [Instruction.OP_SIGN]: [],
    [Instruction.OP_SIGN_VALIDATE]: [],
    [Instruction.STATE_TRANSITION_COMMIT]: [],
    [Instruction.STATE_TRANSITION_PROPOSE]: []
  };

  constructor(readonly state: State, cfOpGenerator: OpGenerator) {
    this.initializeMiddlewares(cfOpGenerator);
  }

  private initializeMiddlewares(cfOpGenerator) {
    this.add(
      Instruction.OP_GENERATE,
      async (message: InternalMessage, next: Function, context: Context) => {
        return cfOpGenerator.generate(message, next, context, this.state);
      }
    );
    this.add(
      Instruction.STATE_TRANSITION_PROPOSE,
      async (message: InternalMessage, next: Function, context: Context) => {
        return StateTransition.propose(message, next, context, this.state);
      }
    );
    this.add(
      Instruction.STATE_TRANSITION_COMMIT,
      async (message: InternalMessage, next: Function, context: Context) => {
        return StateTransition.commit(message, next, context, this.state);
      }
    );
    this.add(Instruction.KEY_GENERATE, KeyGenerator.generate);
    this.add(Instruction.OP_SIGN_VALIDATE, SignatureValidator.validate);
    this.add(Instruction.IO_PREPARE_SEND, NextMsgGenerator.generate);
  }

  public add(scope: Instruction, method: InstructionMiddlewareCallback) {
    this.middlewares[scope].push({ scope, method });
  }

  public async run(msg: InternalMessage, context: Context) {
    let counter = 0;
    const middlewares = this.middlewares;
    const opCode = msg.opCode;

    this.executeAllMiddlewares(msg, context);

    async function callback() {
      if (counter === middlewares[opCode].length - 1) {
        return Promise.resolve(null);
      }
      // This is hacky, prevents next from being called more than once
      counter += 1;
      const middleware = middlewares[opCode][counter];
      if (opCode === Instruction.ALL || middleware.scope === opCode) {
        return middleware.method(msg, callback, context);
      }
      return callback();
    }

    // TODO: Document or throw error about the fact that you _need_ to have
    // a middleware otherwise this will error with:
    // `TypeError: Cannot read property '0' of undefined`
    // https://github.com/counterfactual/monorepo/issues/133

    return this.middlewares[opCode][0].method(msg, callback, context);
  }

  /**
   * Runs the middlewares for Instruction.ALL.
   */
  // TODO: currently this method seems to be passing null as the middleware callback and
  // just iterating through all the middlewares. We should pass the callback similarly to how
  // run does it, and rely on that for middleware cascading
  // https://github.com/counterfactual/monorepo/issues/132
  private executeAllMiddlewares(msg, context) {
    this.middlewares[Instruction.ALL].forEach(middleware => {
      middleware.method(msg, () => {}, context);
    });
  }
}

/**
 * Interface to dependency inject blockchain commitments. The middleware
 * should be constructed with a OpGenerator, which is responsible for
 * creating CfOperations, i.e. commitments, to be stored, used, and signed
 * in the state channel system.
 */
export abstract class OpGenerator {
  public abstract generate(
    message: InternalMessage,
    next: Function,
    context: Context,
    state: State
  );
}

export class NextMsgGenerator {
  public static generate(
    internalMessage: InternalMessage,
    next: Function,
    context: Context
  ) {
    const signature = NextMsgGenerator.signature(internalMessage, context);
    const lastMsg = NextMsgGenerator.lastClientMsg(internalMessage, context);
    const msg: cf.node.ClientActionMessage = {
      signature,
      requestId: "none this should be a notification on completion",
      appId: lastMsg.appId,
      appName: lastMsg.appName,
      action: lastMsg.action,
      data: lastMsg.data,
      multisigAddress: lastMsg.multisigAddress,
      toAddress: lastMsg.fromAddress, // swap to/from here since sending to peer
      fromAddress: lastMsg.toAddress,
      seq: lastMsg.seq + 1
    };
    return msg;
  }

  /**
   * @returns the last received client message for this protocol. If the
   *          protocol just started, then we haven't received a message from
   *          our peer, so just return our starting message. Otherwise, return
   *          the last message from our peer (from IO_WAIT).
   */
  public static lastClientMsg(
    internalMessage: InternalMessage,
    context: Context
  ) {
    const res = getLastResult(Instruction.IO_WAIT, context.results);
    // TODO: make getLastResult's return value nullable
    // https://github.com/counterfactual/monorepo/issues/131
    return JSON.stringify(res) === JSON.stringify({})
      ? internalMessage.clientMessage
      : res.value;
  }

  public static signature(
    internalMessage: InternalMessage,
    context: Context
  ): cf.utils.Signature | undefined {
    // first time we send an install message (from non-ack side) we don't have
    // a signature since we are just exchanging an app-speicific ephemeral key.
    const lastMsg = NextMsgGenerator.lastClientMsg(internalMessage, context);
    if (
      internalMessage.actionName === cf.node.ActionName.INSTALL &&
      lastMsg.seq === 0
    ) {
      return undefined;
    }
    return getFirstResult(Instruction.OP_SIGN, context.results).value;
  }
}

export class KeyGenerator {
  /**
   * After generating this machine's app/ephemeral key, mutate the
   * client message by placing the ephemeral key on it for my address.
   */
  public static generate(message: InternalMessage, next: Function) {
    // const wallet = ethers.Wallet.createRandom();
    // const installData = message.clientMessage.data;
    // FIXME: properly assign ephemeral keys
    // https://github.com/counterfactual/monorepo/issues/116
    //
    // if (installData.peerA.address === message.clientMessage.fromAddress) {
    //  installData.keyA = wallet.address;
    // } else {
    //  installData.keyB = wallet.address;
    // }
    // return wallet;
  }
}

export class SignatureValidator {
  public static async validate(
    message: InternalMessage,
    next: Function,
    context: Context
  ) {
    // const incomingMessage = getFirstResult(
    //   Instruction.IO_WAIT,
    //   context.results
    // );
    // const op = getFirstResult(Instruction.OP_GENERATE, context.results);
    // TODO: now validate the signature against the op hash
    // https://github.com/counterfactual/monorepo/issues/130
    next();
  }
}

/**
 * Utilitiy for middleware to access return values of other middleware.
 */
export function getFirstResult(
  toFindOpCode: Instruction,
  results: OpCodeResult[]
): OpCodeResult {
  // FIXME: (ts-strict) we should change the results data structure or design
  // https://github.com/counterfactual/monorepo/issues/115
  return results.find(({ opCode, value }) => opCode === toFindOpCode)!;
}

export function getLastResult(
  toFindOpCode: Instruction,
  results: OpCodeResult[]
): OpCodeResult {
  for (let k = results.length - 1; k >= 0; k -= 1) {
    if (results[k].opCode === toFindOpCode) {
      return results[k];
    }
  }
  return Object.create(null);
}
