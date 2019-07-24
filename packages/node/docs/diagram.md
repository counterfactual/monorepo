## Diagrams

These diagrams are available to help you understand the underlying architecture of the Node.

If you are reading this on GitHub, please use either of these Chrome extensions to render the diagrams: 

- [mermaid-diagrams](https://chrome.google.com/webstore/detail/mermaid-diagrams/phfcghedmopjadpojhmmaffjmfiakfil)
- [mermaid](https://chrome.google.com/webstore/detail/github-%20-mermaid/goiiopgdnkogdbjmncgedmgpoajilohe)

### Ownership
> arrows indicate "has a pointer to"

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

### Control Flow
> arrows mostly indicate "calls"

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
  
  subgraph NodeController_For_RPC
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
  
  subgraph NodeController_For_Events
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
