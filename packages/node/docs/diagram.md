Here are some diagrams to help you understand the node.

If you are reading this on github.com, please use this Chrome extension to render the diagrams: https://chrome.google.com/webstore/detail/mermaid-diagrams/phfcghedmopjadpojhmmaffjmfiakfil

Ownership - arrows indicate "has a pointer to"

```mermaid
graph LR



  subgraph Node



    InstructionExecutor

    MessagingService

    RpcRouter --> RequestHandler

    RequestHandler --> RpcRouter

    RequestHandler --> StoreService

    RequestHandler --> MessagingService

    RequestHandler --> InstructionExecutor

    

end
```

Control Flow - arrows mostly indicate "calls"

```mermaid
graph LR

  subgraph MessagingService
    onReceive
    send
  end

  subgraph RequestHandler
    callMethod
  end

  subgraph RpcRouter
    dispatch
  end

  subgraph StoreService
    storeServiceSet["set"]
  end

  subgraph NodeController["NodeController (RPC)"]
    rpcExecute["executeMethod"]-->storeServiceSet

    dispatch-->rpcExecute
    callMethod-->rpcExecute
  end

  subgraph Middleware
    IO_SEND_AND_WAIT
    IO_SEND
    OP_SIGN
    WRITE_COMMITMENT-->storeServiceSet
    IO_SEND_AND_WAIT-->send
    IO_SEND-->send
  end

  subgraph Deferral
    ioSendDeferrals["resolve"]
    deferralCtor["constructor"]
  end

  subgraph Signer
    signDigest["signingKey.signDigest"]
  end

  subgraph Node

    onReceivedMessage
    onReceive-->onReceivedMessage

    onReceivedMessage-->ioSendDeferrals

    outgoing["Outgoing (EventEmitter)"]
    protocolMessageEventController-->|sends out events <br>after protocol finishes|outgoing

    OP_SIGN-->signDigest

  end

  subgraph EventController["NodeController (Event)"]

    eventExecute["executeMethod"]-->storeServiceSet
    onReceivedMessage-->eventExecute

  end

  subgraph InstructionExecutor

    initiateProtocol

    runProtocolWithMessage
    protocolMessageEventController-->runProtocolWithMessage
    rpcExecute-->initiateProtocol

    runProtocol

    initiateProtocol-->runProtocol
    runProtocolWithMessage-->runProtocol

    ioSendDeferrals-->|resume|runProtocol

    IO_SEND_AND_WAIT-->deferralCtor

    runProtocol-->IO_SEND_AND_WAIT
    runProtocol-->IO_SEND
    runProtocol-->OP_SIGN
    runProtocol-->WRITE_COMMITMENT

  end
```
