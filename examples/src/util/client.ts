import algosdk from "algosdk";

console.log(
  "ℹ️  The examples uses the testnet AlgoExplorer API for testing purposes. You can change it in `client.ts` file.\n"
);
export const algodClient = new algosdk.Algodv2(
  "",
  "https://node.testnet.algoexplorerapi.io/",
  ""
);
