export const PK_ALICE =
  "0xe74ad40ac33d783e5775666ebbd28d0b395dbb4287bee0e88e1803df6eaa7ab4";

export const PK_ALICE_DUPE =
  "0x114ed1e994780a9d6decfc0915f43668f61b97fe8c37611152fc8b5e942b2dd5";

export const PK_BOB =
  "0x114ed1e994780a9d6decfc0915f43668f61b97fe8c37611152fc8b5e942b2dd5";

export const PK_CHARLIE =
  "0x4a138819ac516411432e76db794333eecd66e88926a528e621e31a97f5280c33";

export const USR_ALICE = {
  username: "alice_account3",
  email: "alice@wonderland.com",
  ethAddress: "0x5fAddCa4889DdC5791cf65446371151f29653285",
  nodeAddress: "0x5fAddCa4889DdC5791cf65446371151f29653285"
};

export const USR_ALICE_DUPLICATE_USERNAME = {
  username: "alice_account3",
  email: "alice@wonderland.com",
  ethAddress: "0x0f693CC956DF59deC24BB1C605ac94CadCe6014d",
  nodeAddress: "0x0f693CC956DF59deC24BB1C605ac94CadCe6014d"
};

export const USR_BOB = {
  email: "bob@wonderland.com",
  ethAddress: "0x0f693CC956DF59deC24BB1C605ac94CadCe6014d",
  multisigAddress: "0xc5F6047a22A5582f62dBcD278f1A2275ab39001A",
  nodeAddress: "0x0f693CC956DF59deC24BB1C605ac94CadCe6014d",
  username: "bob_account1"
};

export const USR_BOB_ID = "e5a48217-5d83-4fdd-bf1d-b9e35934f0f2";

export const USR_CHARLIE = {
  username: "charlie_account2",
  email: "charlie@wonderland.com",
  ethAddress: "0x93678a4828D07708aD34272D61404dD06aE2CA64",
  nodeAddress: "0x93678a4828D07708aD34272D61404dD06aE2CA64"
};

export const POST_USERS_ALICE = {
  data: {
    type: "user",
    attributes: { ...USR_ALICE }
  }
};

export const POST_USERS_ALICE_SIGNATURE_HEADER = {
  authorization:
    "Signature 0xb62fe274751aedfc9ab0a11009d100e798dc17d806e787b699eea72b899ebe9d52a7bd9b66552a41a2359872cae6b56fac1593cc7ac3fbf2cc5d2782563545761b"
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
    "Signature 0x5a129cec41a5ffe092c9b020ee945543d340131605fa5a9b5e6aefea4db619616ca730062155fd0b4922325eb93c75fab673ce35457083bb5d2b81285f3a76f41c"
};

export const POST_USERS_CHARLIE = {
  data: {
    type: "user",
    attributes: { ...USR_CHARLIE }
  }
};

export const POST_USERS_CHARLIE_SIGNATURE_HEADER = {
  authorization:
    "Signature 0x1cf892974e79fc38f7eadd231fb0f27ab11f2888f519bba1b87d5408637ba81a49f290343c179745d6070efa5c9cf9bf060ea704bd9ec9c13de4c8c3baa5f78b1c"
};

export const POST_SESSION_CHARLIE = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: "0x93678a4828d07708ad34272d61404dd06ae2ca64" }
  }
};

export const POST_SESSION_CHARLIE_SIGNATURE_HEADER = {
  authorization:
    "Signature 0x9aaf0833ed78cc9d29c9d2965156ad57a45e0d74cd9ded50910812806f13f8b86dc4c0f0bf802061f3e8e1ff91442adf9652443864a213bbded0e1a12d6bd3fa1b"
};

export const POST_SESSION_BOB = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: "0x0f693cc956df59dec24bb1c605ac94cadce6014d" }
  }
};

export const POST_SESSION_BOB_SIGNATURE_HEADER = {
  authorization:
    "Signature 0xe627ce2761d0f411a985472e3f08edd57915f08743be9bcf9f6b620a2b3b33b90481e2fc8ba195ae9eaa8fb6cdee7ee490561e1792dddc9f86bcb14919fe23591b"
};

export const POST_SESSION_ALICE = {
  data: {
    type: "sessionRequest",
    attributes: { ethAddress: "0x5faddca4889ddc5791cf65446371151f29653285" }
  }
};

export const POST_SESSION_ALICE_SIGNATURE_HEADER = {
  authorization:
    "Signature 0x49adc42b169295b67d8efa9d4da8ad079b5d7ed2475cd8a948de411ba284e3fc4c4039f893bd7d7cc5a44c330e20ae8b7c6d79fc32083fae7bb7f4522903f6bf1c"
};

export const TOKEN_BOB =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJhdHRyaWJ1dGVzIjp7ImVtYWlsIjoiYm9iQHdvbmRlcmxhbmQuY29tIiwiZXRoQWRkcmVzcyI6IjB4MGY2OTNDQzk1NkRGNTlkZUMyNEJCMUM2MDVhYzk0Q2FkQ2U2MDE0ZCIsIm11bHRpc2lnQWRkcmVzcyI6IjB4YzVGNjA0N2EyMkE1NTgyZjYyZEJjRDI3OGYxQTIyNzVhYjM5MDAxQSIsIm5vZGVBZGRyZXNzIjoiMHgwZjY5M0NDOTU2REY1OWRlQzI0QkIxQzYwNWFjOTRDYWRDZTYwMTRkIiwidXNlcm5hbWUiOiJib2JfYWNjb3VudDEifSwiaWQiOiJlNWE0ODIxNy01ZDgzLTRmZGQtYmYxZC1iOWUzNTkzNGYwZjIiLCJpYXQiOjE1NDgyMDA1NjcsImV4cCI6MTU3OTc1ODE2N30.EMeP0Glq0ARFZpgXLkVuIILDOUxtY9n3qQJol7m29Uk";
