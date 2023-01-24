import algosdk from "algosdk";


const ALGOD_TOKEN:string|undefined = undefined;

if(!ALGOD_TOKEN) {
  throw new Error(`⚠️ ALGOD_TOKEN is not set. Please update it inside "src/util/client.ts".
For algosdk reference, see: https://algorand.github.io/js-algorand-sdk/#quick-start`);
}

export const algodClient = new algosdk.Algodv2(
  ALGOD_TOKEN
);
