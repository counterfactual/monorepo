import { BaseProvider } from "ethers/providers";

import { ProtocolExecutionFlow } from "..";
import { Opcode } from "../enums";
import { SetStateCommitment } from "../ethereum";
import { StateChannel } from "../models/state-channel";
import { Context, ProtocolMessage, TakeActionParams } from "../types";
import { xkeyKthAddress } from "../xkeys";

import { validateSignature } from "./utils/signature-validator";

type TakeActionProtocolMessage = ProtocolMessage & { params: TakeActionParams };

/**
 * @description This exchange is described at the following URL:
 *
 * TODO:
 *
 */
export const TAKE_ACTION_PROTOCOL: ProtocolExecutionFlow = {
  0: async function*(
    message: ProtocolMessage,
    context: Context,
    provider: BaseProvider
  ) {
    const {
      appIdentityHash,
      multisigAddress,
      respondingXpub
    } = message.params as TakeActionParams;
    const channel = context.stateChannelsMap.get(
      multisigAddress
    ) as StateChannel;
    const appSeqNo = channel.getAppInstance(appIdentityHash).appSeqNo;

    const setStateCommitment = await addStateTransitionAndCommitmentToContext(
      message as TakeActionProtocolMessage,
      context,
      provider
    );

    const mySig = yield [Opcode.OP_SIGN, setStateCommitment, appSeqNo];

    const { signature } = yield [
      Opcode.IO_SEND_AND_WAIT,
      {
        ...message,
        seq: 1,
        toXpub: respondingXpub,
        signature: mySig
      }
    ];

    validateSignature(
      xkeyKthAddress(respondingXpub, appSeqNo),
      setStateCommitment,
      signature
    );
  },
  1: async function*(
    message: ProtocolMessage,
    context: Context,
    provider: BaseProvider
  ) {
    const setStateCommitment = await addStateTransitionAndCommitmentToContext(
      message as TakeActionProtocolMessage,
      context,
      provider
    );

    const { signature, params } = message;
    const {
      appIdentityHash,
      multisigAddress,
      initiatingXpub
    } = params as TakeActionParams;

    const sc = context.stateChannelsMap.get(multisigAddress) as StateChannel;
    const appSeqNo = sc.getAppInstance(appIdentityHash).appSeqNo;

    validateSignature(
      xkeyKthAddress(initiatingXpub, appSeqNo),
      setStateCommitment,
      signature
    );

    const mySig = yield [Opcode.OP_SIGN, setStateCommitment, appSeqNo];

    yield [
      Opcode.IO_SEND,
      {
        ...message,
        toXpub: initiatingXpub,
        seq: -1,
        signature: mySig
      }
    ];
  }
};

async function addStateTransitionAndCommitmentToContext(
  message: TakeActionProtocolMessage,
  context: Context,
  provider: BaseProvider
): Promise<SetStateCommitment> {
  const { network, stateChannelsMap } = context;
  const { appIdentityHash, action, multisigAddress } = message.params;

  const stateChannel = stateChannelsMap.get(multisigAddress) as StateChannel;

  const appInstance = stateChannel.getAppInstance(appIdentityHash);

  const newChannel = stateChannel.setState(
    appIdentityHash,
    await appInstance.computeStateTransition(action, provider)
  );

  const updatedAppInstance = newChannel.getAppInstance(appIdentityHash);

  const setStateCommitment = new SetStateCommitment(
    network,
    updatedAppInstance.identity,
    updatedAppInstance.hashOfLatestState,
    updatedAppInstance.nonce,
    updatedAppInstance.timeout
  );

  context.stateChannelsMap.set(multisigAddress, newChannel);

  return setStateCommitment;
}
