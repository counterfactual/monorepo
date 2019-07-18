import callAction, { ActionResult } from "../test-utils/call-action";
import EthereumMock, {
  enableEthereumMockBehavior,
  MULTISIG_MOCK_ADDRESS
} from "../test-utils/ethereum.mock";
import { ActionType, ChannelsState } from "../types";
import { getAllChannels, initialState, reducers } from "./channels";

describe("Store > Channels", () => {
  beforeEach(() => {
    window.ethereum = new EthereumMock();
  });
  describe("getAllChannels()", () => {
    it("should fail if there's an error while getting all channels", async () => {
      enableEthereumMockBehavior("forceFailOnGetAllChannels");

      try {
        await callAction<ChannelsState>(getAllChannels, {
          reducers,
          initialState,
          finalActionType: ActionType.ChannelsGetAll
        });
        fail("Query should not have proceeded");
      } catch (e) {
        const {
          dispatchedActions,
          reducedStates
        }: ActionResult<ChannelsState> = e;

        expect(dispatchedActions.length).toBe(1);
        expect(reducedStates.length).toBe(1);

        expect(dispatchedActions).toEqual([
          {
            data: {
              error: {
                message: "Cannot read property 'map' of undefined"
              }
            },
            type: ActionType.ChannelsError
          }
        ]);

        expect(reducedStates).toEqual([
          {
            channels: {},
            error: {
              message: "Cannot read property 'map' of undefined"
            }
          }
        ]);
      }
    });

    it("should get all channels in a Node", async () => {
      const { dispatchedActions, reducedStates } = await callAction<
        ChannelsState
      >(getAllChannels, {
        reducers,
        initialState,
        finalActionType: ActionType.ChannelsGetAll
      });

      expect(dispatchedActions.length).toBe(1);
      expect(reducedStates.length).toBe(1);

      expect(dispatchedActions).toEqual([
        {
          data: {
            channels: {
              [MULTISIG_MOCK_ADDRESS]: {
                ethAddress: MULTISIG_MOCK_ADDRESS,
                type: "hub",
                name: "Hub0",
                connections: []
              }
            }
          },
          type: ActionType.ChannelsGetAll
        }
      ]);

      expect(reducedStates).toEqual([
        {
          channels: {
            [MULTISIG_MOCK_ADDRESS]: {
              ethAddress: MULTISIG_MOCK_ADDRESS,
              type: "hub",
              name: "Hub0",
              connections: []
            }
          }
        }
      ]);
    });
  });
});
