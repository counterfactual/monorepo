import { Node } from "@counterfactual/node";
import { Node as NodeTypes } from "@counterfactual/types";
import { Context } from "koa";
import { v4 as generateUUID } from "uuid";

import {
  ApiResponse,
  CreateAccountRequest,
  CreateAccountResponseData,
  ErrorCode
} from "../types";

// Send { username, email, account_address=<web3_account>, signature=<signed msg by account> }

function validateRequest(params: CreateAccountRequest): ApiResponse {
  if (!params.username) {
    return {
      ok: false,
      error: {
        status: 400,
        errorCode: ErrorCode.UsernameRequired
      }
    };
  }

  if (!params.email) {
    return {
      ok: false,
      error: {
        status: 400,
        errorCode: ErrorCode.EmailRequired
      }
    };
  }

  if (!params.address) {
    return {
      ok: false,
      error: {
        status: 400,
        errorCode: ErrorCode.AddressRequired
      }
    };
  }

  return { ok: true };
}

export default function createAccount(node: Node) {
  return async (ctx: Context, next: () => Promise<void>) => {
    const request = ctx.request.body as CreateAccountRequest;
    const response = validateRequest(request);

    if (!response.ok) {
      ctx.body = response;
      if (response.error) {
        ctx.status = response.error.status;
      }
      return next();
    }

    const multisigResponse = await node.call(
      NodeTypes.MethodName.CREATE_MULTISIG,
      {
        params: {
          owners: [node.address, request.address]
        },
        type: NodeTypes.MethodName.CREATE_MULTISIG,
        requestId: generateUUID()
      }
    );

    const {
      multisigAddress
    } = multisigResponse.result as NodeTypes.CreateMultisigResult;

    response.data = { multisigAddress } as CreateAccountResponseData;

    ctx.status = 200;
    ctx.body = response;
    return next();
  };
}
