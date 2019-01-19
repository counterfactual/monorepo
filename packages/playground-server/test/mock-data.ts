export const USR_ALICE = {
  username: "alice_account3",
  email: "alice@wonderland.com",
  ethAddress: "0x5faddca4889ddc5791cf65446371151f29653285",
  nodeAddress: "0xFE0460D00c589F55Fa60be61050419B008d56e15"
};

export const USR_ALICE_DUPLICATE_USERNAME = {
  username: "alice_account3",
  email: "alice@wonderland.com",
  ethAddress: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
  nodeAddress: "0xdd270e32c1eC7D7Ac90AA02e7E03FBACFa53b34b"
};

export const USR_BOB = {
  email: "bob@wonderland.com",
  ethAddress: "0x0f693cc956df59dec24bb1c605ac94cadce6014d",
  multisigAddress: "0xc5F6047a22A5582f62dBcD278f1A2275ab39001A",
  nodeAddress: "0xFE0460D00c589F55Fa60be61050419B008d56e15",
  username: "bob_account1"
};

export const USR_BOB_ID = "e5a48217-5d83-4fdd-bf1d-b9e35934f0f2";

export const USR_CHARLIE = {
  username: "charlie_account2",
  email: "charlie@wonderland.com",
  ethAddress: "0x93678a4828d07708ad34272d61404dd06ae2ca64",
  nodeAddress: "0xFE0460D00c589F55Fa60be61050419B008d56e15"
};

export const POST_USERS_ALICE = {
  data: {
    type: "user",
    attributes: { ...USR_ALICE }
  }
};

export const POST_USERS_ALICE_SIGNATURE_HEADER = {
  authorization:
    "Signature 0x75d3f99deabc40c2745955ed7c8301a128c2262b45a0d1c7fa9c6d786c93ce4116c57b6c2bbee0304ccc12ada554f063c90a3d87176b854c175cc9e887cbda7b1c"
};

export const POST_USERS_ALICE_NO_SIGNATURE = {
  data: {
    type: "user",
    attributes: { ...USR_ALICE }
  }
};

export const POST_USERS_ALICE_INVALID_SIGNATURE = {
  ...POST_USERS_ALICE
};

export const POST_USERS_ALICE_INVALID_SIGNATURE_HEADER = {
  authorization:
    "Signature 0xc157208c17b60bf325500914d0b4ddf57ee4c9c2ff1509e318c3d138a4ccb08b3258f9ac4e72d824fef67a40c3959e2f6480cdf6fbbf2590ea4a8bb17e7d5c980d"
};

export const POST_USERS_ALICE_DUPLICATE_USERNAME = {
  data: {
    type: "user",
    attributes: { ...USR_ALICE_DUPLICATE_USERNAME }
  }
};

export const POST_USERS_ALICE_DUPLICATE_USERNAME_SIGNATURE_HEADER = {
  authorization:
    "Signature 0x865aa97aa1765903e100648169fb2bdb7259123ba112d81043a14039400a980a3f4bbc4505d8d140a37f6c53add5474e76e11fda44ffbf6842cdbc6c7a3f02f21b"
};

export const POST_USERS_CHARLIE = {
  data: {
    type: "user",
    attributes: { ...USR_CHARLIE }
  }
};

export const POST_USERS_CHARLIE_SIGNATURE_HEADER = {
  authorization:
    "Signature 0xc4365196ccad8af8daa75f02c3b38282de3faafe19e255e271cdbc80f8aea8960fdf8be1356693a1846b7d0e1ff290d313f5064e887ee30935e2f14fba4e76691b"
};

export const POST_SESSION_CHARLIE = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: "0x93678a4828d07708ad34272d61404dd06ae2ca64" }
  }
};

export const POST_SESSION_CHARLIE_SIGNATURE_HEADER = {
  authorization:
    "Signature 0x3978ffd558c3e142b1e7f622b74efed5889e4452c978abd4babcb81cdbda59f345fb5e2b089854cd67c463eb6245931077a34b8404d089003ddcb7aa5ba5a8dd1c"
};

export const POST_SESSION_BOB = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: "0x0f693cc956df59dec24bb1c605ac94cadce6014d" }
  }
};

export const POST_SESSION_BOB_SIGNATURE_HEADER = {
  authorization:
    "Signature 0x0d89ad46772a1ae1e3ae7202da31a32de00d8c8993fa448cc2e6265608c8bd1e493a75ab3e3bc67aa28cce29691a0b013c9c96c06fdf35834b82ad27e46e9d2b1c"
};

export const POST_SESSION_ALICE = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: "0x5faddca4889ddc5791cf65446371151f29653285" }
  }
};

export const POST_SESSION_ALICE_SIGNATURE_HEADER = {
  authorization:
    "Signature 0xf8d4518ce9c41875e5e9bf87201d5b68ebbdf62726fbe9a573ff39bcc3d150d960c8d7e92bbee9d72212eaba58be0205807bf959fe021c1a2f0992ebbc44df601c"
};

export const TOKEN_BOB =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6ImU1YTQ4MjE3LTVkODMtNGZkZC1iZjFkLWI5ZTM1OTM0ZjBmMiIsInR5cGUiOiJ1c2VycyIsImF0dHJpYnV0ZXMiOnsidXNlcm5hbWUiOiJib2JfYWNjb3VudDEiLCJlbWFpbCI6ImJvYkB3b25kZXJsYW5kLmNvbSIsImV0aEFkZHJlc3MiOiIweDBmNjkzY2M5NTZkZjU5ZGVjMjRiYjFjNjA1YWM5NGNhZGNlNjAxNGQiLCJub2RlQWRkcmVzcyI6IjB4RkUwNDYwRDAwYzU4OUY1NUZhNjBiZTYxMDUwNDE5QjAwOGQ1NmUxNSIsIm11bHRpc2lnQWRkcmVzcyI6IjB4YzVGNjA0N2EyMkE1NTgyZjYyZEJjRDI3OGYxQTIyNzVhYjM5MDAxQSJ9LCJpYXQiOjE1NDc3NjQxOTgsImV4cCI6MTU3OTMyMTc5OH0.gjryLLyW1JumqMK__pLFjnMPwTCXCSw4eI9lCkTrEIs";
