import * as ethers from "ethers";
import { Instruction } from "../instructions";
import { CfState, Context } from "../state";
import {
  ActionName,
  ClientActionMessage,
  InternalMessage,
  OpCodeResult,
  Signature
} from "../types";
import { StateTransition } from "./state-transition/state-transition";

/**
 * CfMiddleware is the container holding the groups of middleware responsible
 * for executing a given instruction in the Counterfactual VM.
 */
export class CfMiddleware {
  /**
   * Maps instruction to list of middleware that will process the instruction.
   */
  public middlewares: Object;

  constructor(readonly cfState: CfState, private cfOpGenerator: CfOpGenerator) {
    this.middlewares = {};
    this.add(
      Instruction.OP_GENERATE,
      async (message: InternalMessage, next: Function, context: Context) => {
        return cfOpGenerator.generate(message, next, context, this.cfState);
      }
    );
    this.add(
      Instruction.STATE_TRANSITION_PROPOSE,
      async (message: InternalMessage, next: Function, context: Context) => {
        return StateTransition.propose(message, next, context, this.cfState);
      }
    );
    this.add(
      Instruction.STATE_TRANSITION_COMMIT,
      async (message: InternalMessage, next: Function, context: Context) => {
        return StateTransition.commit(message, next, context, this.cfState);
      }
    );
    this.add(Instruction.KEY_GENERATE, KeyGenerator.generate);
    this.add(Instruction.OP_SIGN_VALIDATE, SignatureValidator.validate);
    this.add(Instruction.IO_PREPARE_SEND, NextMsgGenerator.generate);
  }

  public add(scope: Instruction, method: Function) {
    if (scope in this.middlewares) {
      this.middlewares[scope].push({ scope, method });
    } else {
      this.middlewares[scope] = [{ scope, method }];
    }
  }

  public async run(msg: InternalMessage, context: Context) {
    let counter = 0;
    const middlewares = this.middlewares;
    const opCode = msg.opCode;

    this.executeAllMiddlewares(msg, context);

    async function callback() {
      if (counter === middlewares[opCode].length - 1) {
        return Promise.resolve(null);
      } else {
        // This is hacky, prevents next from being called more than once
        counter++;
        const middleware = middlewares[opCode][counter];
        if (opCode === Instruction.ALL || middleware.scope === opCode) {
          return middleware.method(msg, callback, context);
        } else {
          return callback();
        }
      }
    }

    // TODO: Document or throw error about the fact that you _need_ to have
    // a middleware otherwise this will error with:
    // `TypeError: Cannot read property '0' of undefined`

    return this.middlewares[opCode][0].method(msg, callback, context);
  }

  /**
   * Runs the middlewares for Instruction.ALL.
   */
  // TODO: currently this method seems to be passing null as the middleware callback and
  // just iterating through all the middlewares. We should pass the callback similarly to how
  // run does it, and rely on that for middleware cascading
  private executeAllMiddlewares(msg, context) {
    const all = this.middlewares[Instruction.ALL];
    if (all && all.length > 0) {
      all.forEach(middleware => {
        middleware.method(msg, null, context);
      });
    }
  }
}

/**
 * Interface to dependency inject blockchain commitments. The middleware
 * should be constructed with a CfOpGenerator, which is responsible for
 * creating CfOperations, i.e. commitments, to be stored, used, and signed
 * in the state channel system.
 */
export abstract class CfOpGenerator {
  public abstract generate(
    message: InternalMessage,
    next: Function,
    context: Context,
    cfState: CfState
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
    const msg: ClientActionMessage = {
      requestId: "none this should be a notification on completion",
      appId: lastMsg.appId,
      appName: lastMsg.appName,
      action: lastMsg.action,
      data: lastMsg.data,
      multisigAddress: lastMsg.multisigAddress,
      toAddress: lastMsg.fromAddress, // swap to/from here since sending to peer
      fromAddress: lastMsg.toAddress,
      seq: lastMsg.seq + 1,
      signature
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
    return JSON.stringify(res) === JSON.stringify({})
      ? internalMessage.clientMessage
      : res.value;
  }

  public static signature(
    internalMessage: InternalMessage,
    context: Context
  ): Signature | undefined {
    // first time we send an install message (from non-ack side) we don't have
    // a signature since we are just exchanging an app-speicific ephemeral key.
    const lastMsg = NextMsgGenerator.lastClientMsg(internalMessage, context);
    if (
      internalMessage.actionName === ActionName.INSTALL &&
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
    const wallet = ethers.Wallet.createRandom();
    const installData = message.clientMessage.data;
    // FIXME: properly assign ephemeral keys
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
    const incomingMessage = getFirstResult(
      Instruction.IO_WAIT,
      context.results
    );
    const op = getFirstResult(Instruction.OP_GENERATE, context.results);
    // TODO: now validate the signature against the op hash
    next();
  }
}

/**
 * Utilitiy for middleware to access return values of other middleware.
 */
export function getFirstResult(
  toFindOpCode: Instruction,
  results: Array<{ value: any; opCode }>
): OpCodeResult {
  // FIXME: (ts-strict) we should change the results data structure or design
  return results.find(({ opCode, value }) => opCode === toFindOpCode)!;
}

export function getLastResult(
  toFindOpCode: Instruction,
  results: Array<{ value: any; opCode }>
): OpCodeResult {
  for (let k = results.length - 1; k >= 0; k -= 1) {
    if (results[k].opCode === toFindOpCode) {
      return results[k];
    }
  }
  return Object.create(null);
}
