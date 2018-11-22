# Protocol Spec

## JSON-RPC calls

Message fields:
- `json-rpc`: set to `"2.0"`
- `id`: set to a generated unique ID for this request
- `method`: name of the method to call
- `params`: array of parameters passed to the method call  

## Methods

| method         | params                                                       | result                                                                  |
|----------------|--------------------------------------------------------------|-------------------------------------------------------------------------|
| cf_getApps     | []                                                           | list of {id, definition, state, asset, myDeposit, peerDeposit, timeout} |
| cf_install     | [definition, state, asset, myDeposit, peerDeposit, timeout]  | {id}                                                                    |
| cf_getState    | [id]                                                         | {state}                                                                 |
| cf_getInfo     | [id]                                                         | {definition, asset, myDeposit, peerDeposit, timeout}                    |
| cf_takeAction  | [id, action]                                                 | {newState}                                                              |
| cf_uninstall   | [id]                                                         | OK                                                                      |


### Method Details

#### cf_getApps

TODO
     
#### cf_install

TODO
     
#### cf_getState

TODO
    
#### cf_getInfo

TODO
     
#### cf_takeAction

TODO
  
#### cf_uninstall

TODO



## Events

| event          | params                                                          |
|----------------|-----------------------------------------------------------------|
| install        | {id, definition, state, asset, myDeposit, peerDeposit, timeout} |
| rejectInstall  | {id, definition, state, asset, myDeposit, peerDeposit, timeout} |
| stateUpdate    | {id, state}                                                     |
| uninstall      | {id}                                                            |


### Event Details

#### install

TODO
        
#### rejectInstall

TODO
  
#### stateUpdate

TODO
    
#### uninstall

TODO
